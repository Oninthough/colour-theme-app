This was my Dag, give me the complete modified dag functions are missing here
from __future__ import annotations
from datetime import datetime, timedelta
from airflow.operators.empty import EmptyOperator
import os
import json
from urllib.parse import urlparse
from google.cloud import secretmanager, storage
import google.auth
import mysql.connector
import subprocess
import shlex
from concurrent.futures import ThreadPoolExecutor
from airflow.models import Variable
from airflow.decorators import task
from airflow.models.dag import DAG
from zip_file_alerting_utill import send_email
import re

# Configuration setup
cred = google.auth.default()
project_id = cred[1]

maf_bucket_name = Variable.get("maf_bucket_name")
prefix = Variable.get("maf_files_prefix")
secretmanagerPath = Variable.get("secrets_manager_path")
environment = "Test"
MAX_WORKERS = 2  # Number of parallel threads

default_dag_args = {
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
    'email_on_failure': True,
    'email_on_retry': True,
    'email': re.split("[,;]", "@EMAIL_DIST;vijaykumar.p@transunion.com"),
}

# Utility Functions
def storage_client():
    """Create a GCS storage client"""
    return storage.Client()

def get_db_config():
    """Retrieve database configuration from Secret Manager"""
    client = secretmanager.SecretManagerServiceClient()
    try:
        response = client.access_secret_version(name=secretmanagerPath)
        secret = response.payload.data.decode('UTF-8')
        secret_dict = json.loads(secret)
        total_url = secret_dict["mysql_jdbc-url"]
        parsed_url = urlparse(total_url)
        parsed_url_path = urlparse(parsed_url.path)
        
        return {
            'user': secret_dict["mysql_username"],
            'password': secret_dict["mysql_password"],
            'host': parsed_url_path.hostname,
            'port': parsed_url_path.port,
            'database': parsed_url_path.path.lstrip('/'),
            'ssl_ca': "/home/airflow/gcs/data/certs/server-ca.pem",
            'ssl_cert': "/home/airflow/gcs/data/certs/client-cert.pem",
            'ssl_key': "/home/airflow/gcs/data/certs/client-key.pem"
            }
    except Exception as e:
        print(f"Error retrieving secrets: {e}")
        raise

def initialize_maf_master_table(num_of_files,loader_type):
    """Initialize master table for tracking DAT file processing"""
    config = get_db_config()
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        start_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        insert_query = '''
        INSERT INTO maf_master_data_run 
        (num_of_files, total_records, success_count, failure_count, status, start_date, end_date, loader_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        '''
        cursor.execute(insert_query, (num_of_files, 0, 0, 0, 0, start_date, None, loader_type))
        conn.commit()
        
        cursor.execute("SELECT LAST_INSERT_ID()")
        return cursor.fetchone()[0]
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def download_file_from_gcs(source_file, destination_file):
    """Download file from GCS to local filesystem"""
    client = storage_client()
    bucket = client.bucket(maf_bucket_name)
    blob = bucket.blob(source_file)
    blob.download_to_filename(destination_file)
    print(f'File {source_file} downloaded to {destination_file}')

def delete_file(file_path):
    """Delete local file after processing"""
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f'File {file_path} deleted')
        

def process_single_dat_file(file_name, run_id):
    """Process a single DAT file"""
    try:
        filename = file_name.split('/')[-1]
        tmpfilename = f"/tmp/{filename}"
        # Download file
        download_file_from_gcs(file_name, tmpfilename)
        # Process file
        java_command = f"java -cp /home/airflow/gcs/data/lib/*:/home/airflow/gcs/data/MafDatLoader-1.0-SNAPSHOT.jar com.nis.data.pipeline.maf.MafDatLoader {tmpfilename} {run_id} {secretmanagerPath}"
        command_args = shlex.split(java_command)
        process = subprocess.run(command_args, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE, 
                               text=True)
        print(f"Output for {filename}:")
        print(process.stdout)
        if process.stderr:
            print(f"Errors for {filename}:")
            print(process.stderr)
        process.check_returncode()
        return True
    except Exception as e:
        print(f"Error processing file {filename}: {e}")
        return False
    finally:
        delete_file(tmpfilename)

def parallel_process_dat_files(file_list, run_id):
    """Process DAT files in parallel using ThreadPoolExecutor"""
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [
            executor.submit(process_single_dat_file, file_name, run_id)
            for file_name in file_list
        ]
        results = [future.result() for future in futures]
    return all(results)
def update_maf_master_table(run_id, num_of_files):
    config = get_db_config()
    status = 1
    # Initialize variables with default values
    total_records = 0
    success_count = 0
    failure_count = 0
    end_date = None
    start_date = None
    duration = None
    loader_type = None
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()

        aggregation_query = '''
            SELECT 
                SUM(total_records) as total_records,
                SUM(success_count) as success_count,
                SUM(failure_count) as failure_count,
                MAX(end_date) as end_date,
                MAX(start_date) as start_date,
                loader_type
            FROM 
                maf_file_process_run
            WHERE 
                run_id = %s
            '''
        cursor.execute(aggregation_query, (run_id,))
        result = cursor.fetchone()
        if result:
            total_records, success_count, failure_count, end_date, start_date, loader_type = result
            # Add check for None values before calculating duration
            if start_date is None and end_date is None:
                print("Both start_date and end_date are None")
                duration = None
            elif start_date is None:
                print("start_date is None")
                print(f"end_date value is: {end_date}")
                duration = None
            elif end_date is None:
                print("end_date is None")
                print(f"start_date value is: {start_date}")
                duration = None
            else:
                print(f"Both dates have values - start_date: {start_date}, end_date: {end_date}")
                duration = end_date - start_date
            update_query = '''
            UPDATE 
                maf_master_data_run
            SET 
                total_records = %s,
                success_count = %s,
                failure_count = %s,
                end_date = %s,
                status = %s,
                num_of_files = %s,
                loader_type = %s
            WHERE 
                run_id = %s
            '''
            cursor.execute(update_query, (total_records, success_count, failure_count, 
                                        end_date, status, num_of_files, loader_type, run_id))
            conn.commit()
            print(f"Master Maf table updated for RunId {run_id}")
        else:
            status = 0
            print(f"Conditions not met for updating RunId{run_id} in Master Maf Table")
    except mysql.connector.Error as err:
        status = 0
        print(f"Error: {err}")
    finally:
        send_email(total_records, success_count, failure_count, end_date, 
                  start_date, status, num_of_files, run_id, duration, loader_type)
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()


# DAG Definition
with DAG('zip_file_loader', 
         schedule_interval='@once', 
         start_date=datetime(2024, 6, 27), 
         default_args=default_dag_args) as dag:

    @task(task_id="get_datFiles_from_gcs")
    def get_datFiles_from_gcs(**kwargs):
        client = storage_client()
        bucket = client.bucket(maf_bucket_name)
        filenames = bucket.list_blobs(prefix=prefix)
        files = [filename.name for filename in filenames if filename.name.endswith(".dat")]
        num_files = len(files)
        loader_type = "Zip Loader"
        run_id = initialize_maf_master_table(num_files, loader_type)
        ti = kwargs.get('ti')
        ti.xcom_push(key='num_files', value=num_files)
        ti.xcom_push(key='run_id', value=run_id)
        return files

    @task(task_id="process_mafDat_files")
    def process_mafDat_files(file_list, **kwargs):
        ti = kwargs['ti']
        run_id = ti.xcom_pull(task_ids='get_datFiles_from_gcs', key='run_id')
        return parallel_process_dat_files(file_list, run_id)

    @task(task_id="finalize")
    def finalize(**kwargs):
        ti = kwargs['ti']
        run_id = ti.xcom_pull(task_ids='get_datFiles_from_gcs', key='run_id')
        num_of_files = ti.xcom_pull(task_ids='get_datFiles_from_gcs', key='num_files')
        update_maf_master_table(run_id, num_of_files)

    # Task flow
    end = EmptyOperator(task_id="end")
    file_list = get_datFiles_from_gcs()
    process_files = process_mafDat_files(file_list)
    
    # Define task dependencies
    file_list >> process_files >> finalize() >> end
Which is Using a java Jar to complete the processing of the file which is 
MafDatLoader-1.0-SNAPSHOT.jar
here is the main file of the java project 
package com.nis.data.pipeline.maf;

import com.nis.data.pipeline.maf.loader.Zip5Loader;
import com.nis.data.pipeline.maf.loader.Zip9Loader;
import com.nis.data.pipeline.maf.util.AccessSecretVersion;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import com.nis.data.pipeline.maf.exception.AppRuntimeException;

import java.time.LocalDateTime;

public class MafDatLoader {
    private static final Logger log = LogManager.getLogger(MafDatLoader.class);
    private static String secretsManagerPath = null;
//        private static String secretsManagerPath = "/Users/anghosh/Desktop/sp-7/BE/New structure/maf_data_loader_secrets_utils.py";

    public static void main(String[] args) {
        LocalDateTime mainMethodStartLocalDateTime = LocalDateTime.now();
        System.out.println("Application Starting");
        log.info("Time before starting:: {}", mainMethodStartLocalDateTime);
        String filename = null;
        String runId = null;
//        String filename = "C:\\Users\\makhtar\\work\\nis.dataloaders.maf\\src\\main\\resources\\MAF_Output_v5.parquet";
//        String filename = "C:\\work\\parquetTestFiles\\maf10k.parquet";
//        filename = "/Users/anghosh/Downloads/MAFZip4Summary.dat";
//        filename = "/Users/anghosh/Downloads/MAFZipSummary.dat";
////        String runId = null;
//                String runId = "5";
//        String pathToZip5File = "C:\\Users\\makhtar\\work\\nis.dataloaders.maf\\src\\main\\resources\\MAFZipSummary.dat";
//        String pathToZip9File = "C:\\Users\\makhtar\\work\\nis.dataloaders.maf\\src\\main\\resources\\MAFZip4Summary.dat";
        if (args != null && args.length > 0) {
            filename = args[0];
            runId = args[1];
            secretsManagerPath = args[2];
        }
        if (runId == null) {
            throw new AppRuntimeException("Run Id cannot be null or empty");
        }
        if (filename == null) {
            throw new AppRuntimeException("filename cannot be null or empty");
        }
        if (secretsManagerPath == null) {
            throw new RuntimeException("secrets path not found");
        }

        AccessSecretVersion.setSecretsPath(secretsManagerPath);
                Zip5Loader zip5Loader = new Zip5Loader();
          Zip9Loader zip9Loader = new Zip9Loader();
          String loadertype1 = "Zip 5 loader";
        String loadertype2 = "Zip 9 loader";


//        addressLoader.loadAddressMafFile(runId, filename, LocalDateTime.now());

        zip5Loader.loadZip5File(new MafDatLoader(), runId, filename, mainMethodStartLocalDateTime, loadertype1);
        zip9Loader.loadZip9File(new MafDatLoader(), runId, filename, mainMethodStartLocalDateTime,loadertype2);
        //The filename and path are same so passing both as 'filename'
//        System.out.println("ADDRESS LOADER STARTING");
//        AddressLoader addressLoader = new AddressLoader();
//        addressLoader.loadAddressMafFile(new MafLoader(), runId, filename, LocalDateTime.now());
//        Zip5Loader zip5Loader = new Zip5Loader();
//        zip5Loader.loadZip5File(new MafDatLoader(), "5","/Users/anghosh/Downloads/MAFZipSummary.dat",LocalDateTime.now());
//        Zip9Loader zip9Loader = new Zip9Loader();
//        zip9Loader.loadZip9File(new MafDatLoader(),"5","/Users/anghosh/Downloads/MAFZip4Summary.dat",LocalDateTime.now());
//        System.out.println("ADDRESS LOADER ENDED");
//        System.out.println("ZIP5SUMMARY LOADER STARTING");
//        Zip5Loader zip5Loader = new Zip5Loader();
//        zip5Loader.loadZip5File(new MafLoader(), runId, pathToZip5File, LocalDateTime.now());
//        System.out.println("ZIP5SUMMARY LOADER ENDED");
//        System.out.println("ZIP9SUMMARY LOADER STARTING");
//        Zip9Loader zip9Loader = new Zip9Loader();
//        zip9Loader.loadZip9File(new MafLoader(), runId, pathToZip9File, LocalDateTime.now());
//        System.out.println("ZIP9SUMMARY LOADER ENDED");

    }

    public String getSecretManagerPath() {
        return secretsManagerPath;
    }

}
but this code is not even running if possible remove thread implementation from the dag and process the file sequencially make changes to main file also if needed the java code was working fine from the local but from the dag this code is not runing do the fix and give me the updated dag and the main file also




from datetime import datetime, timedelta
from airflow.operators.empty import EmptyOperator
from airflow.models import Variable, DAG
from airflow.decorators import task
import os
import subprocess
import shlex
from google.cloud import storage

# Configuration setup
default_dag_args = {
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
    'email_on_failure': True,
    'email_on_retry': True,
    'email': "vijaykumar.p@transunion.com",
}

# DAG Definition
with DAG('zip_file_loader',
         schedule_interval='@once',
         start_date=datetime(2024, 6, 27),
         default_args=default_dag_args) as dag:

    @task(task_id="get_dat_files_from_gcs")
    def get_dat_files_from_gcs():
        """Retrieve DAT files from GCS and classify them"""
        client = storage.Client()
        bucket = client.bucket(Variable.get("maf_bucket_name"))
        prefix = Variable.get("maf_files_prefix")
        filenames = bucket.list_blobs(prefix=prefix)
        zip5_files = [filename.name for filename in filenames if "Zip5" in filename.name]
        zip9_files = [filename.name for filename in filenames if "Zip9" in filename.name]
        return zip5_files, zip9_files

    @task(task_id="process_dat_file")
    def process_dat_file(file_name, loader_type):
        """Process a single DAT file with given loader type"""
        filename = file_name.split('/')[-1]
        tmpfilename = f"/tmp/{filename}"
        secrets_path = Variable.get('secrets_manager_path')
        java_command = f"java -cp '/home/airflow/gcs/data/lib/*:/home/airflow/gcs/data/MafDatLoader-1.0-SNAPSHOT.jar' com.nis.data.pipeline.maf.MafDatLoader {tmpfilename} {run_id} {secrets_path} {loader_type}"
        command_args = shlex.split(java_command)
        subprocess.run(command_args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    @task(task_id="finalize")
    def finalize():
        """Finalize processing"""
        print("All files processed.")

    # Define task flow
    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")
    zip5_files, zip9_files = get_dat_files_from_gcs()
    process_zip5_files = zip5_files.expand(task_id="process_zip5_file", file_name=zip5_files, loader_type="Zip5")
    process_zip9_files = zip9_files.expand(task_id="process_zip9_file", file_name=zip9_files, loader_type="Zip9")

    start >> zip5_files >> process_zip5_files >> finalize() >> end
    start >> zip9_files >> process_zip9_files >> finalize() >> end







package com.nis.data.pipeline.maf;

import com.nis.data.pipeline.maf.loader.Zip5Loader;
import com.nis.data.pipeline.maf.loader.Zip9Loader;
import com.nis.data.pipeline.maf.util.AccessSecretVersion;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.time.LocalDateTime;

public class MafDatLoader {
    private static final Logger log = LogManager.getLogger(MafDatLoader.class);

    public static void main(String[] args) {
        LocalDateTime mainMethodStartLocalDateTime = LocalDateTime.now();
        log.info("Application Starting at {}", mainMethodStartLocalDateTime);

        if (args.length < 4) {
            throw new RuntimeException("Insufficient arguments provided.");
        }

        String filename = args[0];
        String runId = args[1];
        String secretsManagerPath = args[2];
        String loaderType = args[3];

        AccessSecretVersion.setSecretsPath(secretsManagerPath);

        if ("Zip5".equalsIgnoreCase(loaderType)) {
            Zip5Loader zip5Loader = new Zip5Loader();
            zip5Loader.loadZip5File(runId, filename, mainMethodStartLocalDateTime);
        } else if ("Zip9".equalsIgnoreCase(loaderType)) {
            Zip9Loader zip9Loader = new Zip9Loader();
            zip9Loader.loadZip9File(runId, filename, mainMethodStartLocalDateTime);
        } else {
            log.error("Invalid loader type specified.");
            throw new RuntimeException("Invalid loader type specified.");
        }
    }
}
.





from __future__ import annotations
from datetime import datetime, timedelta
from airflow.operators.empty import EmptyOperator
import os
import json
from urllib.parse import urlparse
from google.cloud import secretmanager, storage
import google.auth
import mysql.connector
import subprocess
import shlex
from airflow.models import Variable
from airflow.decorators import task
from airflow.models.dag import DAG
from zip_file_alerting_util import send_email
import re

# Configuration setup
cred = google.auth.default()
project_id = cred[1]

maf_bucket_name = Variable.get("maf_bucket_name")
prefix = Variable.get("maf_files_prefix")
secretmanagerPath = Variable.get("secrets_manager_path")
environment = "Test"

default_dag_args = {
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
    'email_on_failure': True,
    'email_on_retry': True,
    'email': re.split("[,;]", "@EMAIL_DIST;vijaykumar.p@transunion.com"),
}

# Utility Functions
def storage_client():
    """Create a GCS storage client"""
    return storage.Client()

def get_db_config():
    """Retrieve database configuration from Secret Manager"""
    client = secretmanager.SecretManagerServiceClient()
    try:
        response = client.access_secret_version(name=secretmanagerPath)
        secret = response.payload.data.decode('UTF-8')
        secret_dict = json.loads(secret)
        total_url = secret_dict["mysql_jdbc-url"]
        parsed_url = urlparse(total_url)
        parsed_url_path = urlparse(parsed_url.path)
        
        return {
            'user': secret_dict["mysql_username"],
            'password': secret_dict["mysql_password"],
            'host': parsed_url_path.hostname,
            'port': parsed_url_path.port,
            'database': parsed_url_path.path.lstrip('/'),
            'ssl_ca': "/home/airflow/gcs/data/certs/server-ca.pem",
            'ssl_cert': "/home/airflow/gcs/data/certs/client-cert.pem",
            'ssl_key': "/home/airflow/gcs/data/certs/client-key.pem"
            }
    except Exception as e:
        print(f"Error retrieving secrets: {e}")
        raise

def initialize_maf_master_table(num_of_files,loader_type):
    """Initialize master table for tracking DAT file processing"""
    config = get_db_config()
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        start_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        insert_query = '''
        INSERT INTO maf_master_data_run 
        (num_of_files, total_records, success_count, failure_count, status, start_date, end_date, loader_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        '''
        cursor.execute(insert_query, (num_of_files, 0, 0, 0, 0, start_date, None, loader_type))
        conn.commit()
        
        cursor.execute("SELECT LAST_INSERT_ID()")
        return cursor.fetchone()[0]
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

def download_file_from_gcs(source_file, destination_file):
    """Download file from GCS to local filesystem"""
    client = storage_client()
    bucket = client.bucket(maf_bucket_name)
    blob = bucket.blob(source_file)
    blob.download_to_filename(destination_file)
    print(f'File {source_file} downloaded to {destination_file}')

def delete_file(file_path):
    """Delete local file after processing"""
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f'File {file_path} deleted')

def process_single_dat_file(file_name, run_id, loader_type):
    """Process a single DAT file"""
    try:
        filename = file_name.split('/')[-1]
        tmpfilename = f"/tmp/{filename}"
        # Download file
        download_file_from_gcs(file_name, tmpfilename)
        # Process file
        java_command = f"java -cp /home/airflow/gcs/data/lib/*:/home/airflow/gcs/data/MafDatLoader-1.0-SNAPSHOT.jar com.nis.data.pipeline.maf.MafDatLoader {tmpfilename} {run_id} {secretmanagerPath} {loader_type}"
        command_args = shlex.split(java_command)
        process = subprocess.run(command_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print(f"Output for {filename}:")
        print(process.stdout)
        if process.stderr:
            print(f"Errors for {filename}:")
            print(process.stderr)
        process.check_returncode()
        return True
    except Exception as e:
        print(f"Error processing file {filename}: {e}")
        return False
    finally:
        delete_file(tmpfilename)

# DAG Definition
with DAG('zip_file_loader', 
         schedule_interval='@once', 
         start_date=datetime(2024, 6, 27), 
         default_args=default_dag_args) as dag:

    @task(task_id="get_datFiles_from_gcs")
    def get_datFiles_from_gcs():
        client = storage_client()
        bucket = client.bucket(maf_bucket_name)
        filenames = bucket.list_blobs(prefix=prefix)
        zip5_files = [filename.name for filename in filenames if "Zip5" in filename.name]
        zip9_files = [filename.name for filename in filenames if "Zip9" in filename.name]
        num_files = len(zip5_files) + len(zip9_files)
        loader_type = "Zip Loader"
        run_id = initialize_maf_master_table(num_files, loader_type)
        return zip5_files, zip9_files, run_id

    @task(task_id="process_zip5_dat_files")
    def process_zip5_dat_files(zip5_files, run_id):
        results = [process_single_dat_file(file, run_id, "Zip5") for file in zip5_files]
        return all(results)

    @task(task_id="process_zip9_dat_files")
    def process_zip9_dat_files(zip9_files, run_id):
        results = [process_single_dat_file(file, run_id, "Zip9") for file in zip9_files]
        return all(results)

    @task(task_id="finalize")
    def finalize():
        """Final task to finish the workflow"""
        print("All files processed successfully.")

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")

    zip5_files, zip9_files, run_id = get_datFiles_from_gcs()
    process_zip5 = process_zip5_dat_files(zip5_files, run_id)
    process_zip9 = process_zip9_dat_files(zip9_files, run_id)

    start >> get_datFiles_from_gcs() >> [process_zip5, process_zip9] >> finalize() >> end


from __future__ import annotations
from datetime import datetime, timedelta
from airflow.operators.empty import EmptyOperator
import os
import json
from urllib.parse import urlparse
from google.cloud import secretmanager, storage
import google.auth
import mysql.connector
import subprocess
import shlex
from airflow.models import Variable
from airflow.decorators import task
from airflow.models.dag import DAG
from zip_file_alerting_util import send_email
import re

# Configuration setup
cred = google.auth.default()
project_id = cred[1]

maf_bucket_name = Variable.get("maf_bucket_name")
prefix = Variable.get("maf_files_prefix")
secretmanagerPath = Variable.get("secrets_manager_path")
environment = "Test"

default_dag_args = {
    'retries': 1,
    'retry_delay': timedelta(minutes=2),
    'email_on_failure': True,
    'email_on_retry': True,
    'email': re.split("[,;]", "@EMAIL_DIST;vijaykumar.p@transunion.com"),
}

# Utility Functions
def storage_client():
    """Create a GCS storage client"""
    return storage.Client()

def get_db_config():
    """Retrieve database configuration from Secret Manager"""
    client = secretmanager.SecretManagerServiceClient()
    try:
        response = client.access_secret_version(name=secretmanagerPath)
        secret = response.payload.data.decode('UTF-8')
        secret_dict = json.loads(secret)
        total_url = secret_dict["mysql_jdbc-url"]
        parsed_url = urlparse(total_url)
        
        return {
            'user': secret_dict["mysql_username"],
            'password': secret_dict["mysql_password"],
            'host': parsed_url.hostname,
            'port': parsed_url.port,
            'database': parsed_url.path.lstrip('/'),
            'ssl_ca': "/home/airflow/gcs/data/certs/server-ca.pem",
            'ssl_cert': "/home/airflow/gcs/data/certs/client-cert.pem",
            'ssl_key': "/home/airflow/gcs/data/certs/client-key.pem"
        }
    except Exception as e:
        print(f"Error retrieving secrets: {e}")
        raise

def download_file_from_gcs(source_file, destination_file):
    """Download file from GCS to local filesystem"""
    client = storage_client()
    bucket = client.bucket(maf_bucket_name)
    blob = bucket.blob(source_file)
    blob.download_to_filename(destination_file)
    print(f'File {source_file} downloaded to {destination_file}')

def delete_file(file_path):
    """Delete local file after processing"""
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f'File {file_path} deleted')

def process_single_dat_file(file_name, loader_type):
    """Process a single DAT file"""
    try:
        filename = file_name.split('/')[-1]
        tmpfilename = f"/tmp/{filename}"
        # Download file
        download_file_from_gcs(file_name, tmpfilename)
        # Process file
        java_command = f"java -cp /home/airflow/gcs/data/lib/*:/home/airflow/gcs/data/MafDatLoader-1.0-SNAPSHOT.jar com.nis.data.pipeline.maf.MafDatLoader {tmpfilename} {Variable.get('run_id')} {secretmanagerPath} {loader_type}"
        command_args = shlex.split(java_command)
        process = subprocess.run(command_args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        print(f"Output for {filename}: {process.stdout}")
        if process.stderr:
            print(f"Errors for {filename}: {process.stderr}")
        process.check_returncode()
        return True
    except Exception as e:
        print(f"Error processing file {filename}: {e}")
        return False
    finally:
        delete_file(tmpfilename)

# DAG Definition
with DAG('zip_file_loader',
         schedule_interval='@once',
         start_date=datetime(2024, 6, 27),
         default_args=default_dag_args) as dag:

    @task(task_id="get_dat_files_from_gcs")
    def get_dat_files_from_gcs():
        """Retrieve DAT files from GCS"""
        client = storage_client()
        bucket = client.bucket(maf_bucket_name)
        filenames = bucket.list_blobs(prefix=prefix)
        zip5_files = [filename.name for filename in filenames if "Zip5" in filename.name]
        zip9_files = [filename.name for filename in filenames if "Zip9" in filename.name]
        return {'zip5_files': zip5_files, 'zip9_files': zip9_files}

    @task(task_id="process_dat_files")
    def process_dat_files(files):
        """Process DAT files"""
        results = []
        for file_name in files['zip5_files']:
            results.append(process_single_dat_file(file_name, "Zip5"))
        for file_name in files['zip9_files']:
            results.append(process_single_dat_file(file_name, "Zip9"))
        return all(results)

    start = EmptyOperator(task_id="start")
    end = EmptyOperator(task_id="end")
    files = get_dat_files_from_gcs()
    process_files = process_dat_files(files)

    start >> files >> process_files >> end
    
