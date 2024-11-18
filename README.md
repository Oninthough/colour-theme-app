CREATE TABLE Web.GetData.Elements (
	ElementID int NOT NULL,
	Name varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Description varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	ResultFormatID int NULL,
	Delimiter varchar(8) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Enabled bit NOT NULL,
	Roles varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_Elements PRIMARY KEY (ElementID)
);
-- Web.GetData.Elements foreign keys
ALTER TABLE Web.GetData.Elements ADD CONSTRAINT FK_Elements_ResultFormats FOREIGN KEY (ResultFormatID) REFERENCES Web.GetData.ResultFormats(ResultFormatID);

CREATE TABLE Web.GetData.ResultFields (
	ElementID int NOT NULL,
	FieldIndex int NOT NULL,
	Name varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Description varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Example varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[Start] int NULL,
	[Size] int NULL,
	[Path] varchar(512) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	[Default] bit NOT NULL,
	FieldPicker varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	FormattedField xml NULL,
	ResultFieldTypeID int NULL,
	CONSTRAINT PK_ResultFields PRIMARY KEY (ElementID,FieldIndex),
	CONSTRAINT UQ__ResultFields_ElementID_Name UNIQUE (ElementID,Name)
);
-- Web.GetData.ResultFields foreign keys
ALTER TABLE Web.GetData.ResultFields ADD CONSTRAINT FK_Fields_Elements FOREIGN KEY (ElementID) REFERENCES Web.GetData.Elements(ElementID);

CREATE TABLE Web.GetData.FileAppend_Results (
	ResultId uniqueidentifier NOT NULL,
	OrigId int NOT NULL,
	SubmittedDate datetime NOT NULL,
	SubmittedFilename nvarchar(256) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Status nvarchar(25) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	LongTrans xml NOT NULL,
	LastCheckedDate datetime NOT NULL,
	OutputFilename nvarchar(256) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	Url nvarchar(256) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	EshipUrl varchar(300) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	FileAppendQueryLogId int NULL,
	CONSTRAINT PK_FileAppend_Results PRIMARY KEY (ResultId)
);
 CREATE NONCLUSTERED INDEX IDX_Results ON GetData.FileAppend_Results (  OrigId ASC  , SubmittedDate ASC  )  
	 WITH (  PAD_INDEX = OFF ,FILLFACTOR = 100  ,SORT_IN_TEMPDB = OFF , IGNORE_DUP_KEY = OFF , STATISTICS_NORECOMPUTE = OFF , ONLINE = OFF , ALLOW_ROW_LOCKS = ON , ALLOW_PAGE_LOCKS = ON  )
	 ON [PRIMARY ] ;
-- Web.GetData.FileAppend_Results foreign keys
ALTER TABLE Web.GetData.FileAppend_Results ADD CONSTRAINT FK_FileAppend_Results_FileAppendQueryLog FOREIGN KEY (FileAppendQueryLogId) REFERENCES Web.GetData.FileAppendQueryLog(LogId);



CREATE TABLE Web.GetData.FileAppendQueryLog (
	LogId int IDENTITY(1,1) NOT NULL,
	QueryDate datetime NOT NULL,
	UserName nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	UserAddress nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	[Path] nvarchar(128) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Computer nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	QuerySpec xml NOT NULL,
	FileSpec xml NOT NULL,
	InputSpec xml NOT NULL,
	[File] nvarchar(128) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	SessionId nvarchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	CONSTRAINT PK_FileAppendQueryLog PRIMARY KEY (LogId)
);


CREATE TABLE Web.GetData.Inputs (
	InputID int NOT NULL,
	Name varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
	Description varchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
	FormControlID int NOT NULL,
	CONSTRAINT PK_Inputs PRIMARY KEY (InputID)
);


import javax.xml.bind.annotation.*;
import java.util.List;

@XmlRootElement(name = "queryspec")
@XmlAccessorType(XmlAccessType.FIELD)
public class QuerySpec {
    @XmlElement(name = "sessionid")
    private String sessionId;

    @XmlElementWrapper(name = "parameters")
    @XmlElement(name = "parameter")
    private List<Parameter> parameters;

    @XmlElementWrapper(name = "elements")
    @XmlElement(name = "element")
    private List<Element> elements;

    // Getters and Setters
}

@XmlAccessorType(XmlAccessType.FIELD)
class Parameter {
    @XmlAttribute
    private int id;

    @XmlAttribute
    private String name;

    @XmlAttribute
    private String operation;

    @XmlElement(name = "input")
    private Input input;

    // Getters and Setters
}

@XmlAccessorType(XmlAccessType.FIELD)
class Input {
    @XmlAttribute
    private int id;

    @XmlValue
    private String value;

    // Getters and Setters
}

@XmlAccessorType(XmlAccessType.FIELD)
class Element {
    @XmlAttribute
    private int id;

    @XmlAttribute
    private String name;

    @XmlAttribute
    private String format;

    @XmlAttribute
    private String delimiter;

    @XmlElement(name = "errorcode")
    private ErrorCode errorCode;

    @XmlElementWrapper(name = "fields")
    @XmlElement(name = "field")
    private List<Field> fields;

    // Getters and Setters
}

@XmlAccessorType(XmlAccessType.FIELD)
class ErrorCode {
    @XmlAttribute
    private String id;

    // Getters and Setters
}

@XmlAccessorType(XmlAccessType.FIELD)
class Field {
    @XmlAttribute
    private String id;

    @XmlAttribute
    private int index;

    // Getters and Setters
}
 

import javax.xml.bind.JAXBContext;
import javax.xml.bind.Marshaller;
import java.io.StringWriter;

public class XmlProcessor {
    public String toXml(QuerySpec querySpec) throws Exception {
        JAXBContext jaxbContext = JAXBContext.newInstance(QuerySpec.class);
        Marshaller marshaller = jaxbContext.createMarshaller();
        marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);

        StringWriter writer = new StringWriter();
        marshaller.marshal(querySpec, writer);

        return writer.toString();
    }
}
import javax.xml.bind.JAXBContext;
import javax.xml.bind.Unmarshaller;
import java.io.StringReader;

public class XmlProcessor {
    public QuerySpec fromXml(String xml) throws Exception {
        JAXBContext jaxbContext = JAXBContext.newInstance(QuerySpec.class);
        Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();

        StringReader reader = new StringReader(xml);
        return (QuerySpec) unmarshaller.unmarshal(reader);
    }
}




import javax.persistence.*;
import java.util.Date;
import lombok.*;

@Data
@Entity
@Table(name = "FileAppendQueryLog", schema = "Web.GetData")
public class FileAppendQueryLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "LogId")
    private Integer logId;

    @Column(name = "QueryDate", nullable = false)
    private Date queryDate;

    @Column(name = "UserName", nullable = false, length = 50)
    private String userName;

    @Column(name = "UserAddress", length = 50)
    private String userAddress;

    @Column(name = "Path", nullable = false, length = 128)
    private String path;

    @Column(name = "Computer", length = 50)
    private String computer;

    @Lob
    @Column(name = "QuerySpec", nullable = false)
    private String querySpec;

    @Lob
    @Column(name = "FileSpec", nullable = false)
    private String fileSpec;

    @Lob
    @Column(name = "InputSpec", nullable = false)
    private String inputSpec;

    @Column(name = "File", length = 128)
    private String file;

    @Column(name = "SessionId", length = 50)
    private String sessionId;
}

import javax.persistence.*;
import java.util.Date;
import java.util.UUID;
import lombok.*;

@Data
@Entity
@Table(name = "FileAppend_Results", schema = "Web.GetData")
public class FileAppendResult {
    @Id
    @Column(name = "ResultId", columnDefinition = "uniqueidentifier")
    private UUID resultId;

    @Column(name = "OrigId", nullable = false)
    private Integer origId;

    @Column(name = "SubmittedDate", nullable = false)
    private Date submittedDate;

    @Column(name = "SubmittedFilename", nullable = false, length = 256)
    private String submittedFilename;

    @Column(name = "Status", nullable = false, length = 25)
    private String status;

    @Lob
    @Column(name = "LongTrans", nullable = false)
    private String longTrans;

    @Column(name = "LastCheckedDate", nullable = false)
    private Date lastCheckedDate;

    @Column(name = "OutputFilename", length = 256)
    private String outputFilename;

    @Column(name = "Url", length = 256)
    private String url;

    @Column(name = "EshipUrl", length = 300)
    private String eshipUrl;

    @Column(name = "FileAppendQueryLogId")
    private Integer fileAppendQueryLogId;

    // Bi-directional relationships if necessary
    @ManyToOne
    @JoinColumn(name = "FileAppendQueryLogId", insertable = false, updatable = false)
    private FileAppendQueryLog fileAppendQueryLog;
}
import javax.persistence.*;
import lombok.*;

@Data
@Entity
@Table(name = "ResultFields", schema = "Web.GetData")
@IdClass(ResultFieldId.class) // Composite primary key class
public class ResultField {
    @Id
    @Column(name = "ElementID")
    private Integer elementId;

    @Id
    @Column(name = "FieldIndex")
    private Integer fieldIndex;

    @Column(name = "Name", nullable = false, length = 50)
    private String name;

    @Column(name = "Description", columnDefinition = "varchar(MAX)")
    private String description;

    @Column(name = "Example", columnDefinition = "varchar(MAX)")
    private String example;

    @Column(name = "Start")
    private Integer start;

    @Column(name = "Size")
    private Integer size;

    @Column(name = "Path", length = 512)
    private String path;

    @Column(name = "Default", nullable = false)
    private boolean isDefault;

    @Column(name = "FieldPicker", length = 50)
    private String fieldPicker;

    @Lob
    @Column(name = "FormattedField", columnDefinition = "xml")
    private String formattedField;

    @Column(name = "ResultFieldTypeID")
    private Integer resultFieldTypeId;

    // Mapping back to Element
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ElementID", insertable = false, updatable = false)
    private Element element;
}
import java.io.Serializable;
import javax.persistence.*;

@Embeddable
public class ResultFieldId implements Serializable {
    private Integer elementId;
    private Integer fieldIndex;

    // Constructors, getters and setters, hashCode, equals methods are needed
    public ResultFieldId() {}

    public ResultFieldId(Integer elementId, Integer fieldIndex) {
        this.elementId = elementId;
        this.fieldIndex = fieldIndex;
    }

    // standard getters and setters

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ResultFieldId that = (ResultFieldId) o;
        return elementId.equals(that.elementId) && fieldIndex.equals(that.fieldIndex);
    }

    @Override
    public int hashCode() {
        return Objects.hash(elementId, fieldIndex);
    }
}



import javax.persistence.*;
import lombok.*;

@Data
@Entity
@Table(name = "Inputs", schema = "Web.GetData")
public class Inputs {
    @Id
    @Column(name = "InputID")
    private Integer inputId;

    @Column(name = "Name", nullable = false, length = 50)
    private String name;

    @Column(name = "Description", columnDefinition = "varchar(MAX)")
    private String description;

    @Column(name = "FormControlID", nullable = false)
    private Integer formControlId;
}
    @PostMapping("process-file-result/{elementId}")
    public ResponseEntity<byte[]> processFile(@PathVariable Long elementId,@RequestParam("delimeter") String delimeter, @RequestParam("fieldIndex") int[] fieldIndex, @RequestParam("file") MultipartFile file ) throws IOException {
        String content = new String(file.getBytes());
        String content2 = resultFieldsService.processFileGeneration(content, elementId, delimeter, fieldIndex);
        byte[] op = content2.getBytes();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMddHHmm");
        String timestamp = dateFormat.format(new Date());
        String filename = "process-file-result-"+elementId + timestamp + ".txt";

        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return ResponseEntity.ok()
                .headers(headers)
                .body(op);
    }

public String processFileGeneration(String content, Long elementId, String delimeter, int[] fieldIndex) {

        List<ElementServiceKeyMap> elementServiceKeyMap = elementServiceKeyMapRepository.findByElementID(elementId);
        List<Long> serviceKeyIdList = new ArrayList<Long>();
        for (ElementServiceKeyMap e1 : elementServiceKeyMap) {
            serviceKeyIdList.add(e1.getServiceKeyID());
        }
        // Fetching the result fields based on the element ID
        List<ResultFields> resultFields = resultFieldsRepository.findByElementID(elementId);

        // Splitting the content into lines
        String[] lines = content.split("\n");
        if (lines.length < 1) {
            return ""; // Return empty if no content is provided
        }

        // First line contains the headers
        String[] headers = lines[0].split("\\|");
        for (int i = 0; i < headers.length; i++) {
            headers[i] = "\"" + headers[i].trim() + "\""; // Format headers for output
        }
        String header = String.join("delimeter", headers) + " delimeter \"EID " + elementId + " ResultCode\"";

        //from resultFields
        String dynamicHeaders = resultFields.stream()
                .map(ResultFields::getName)
                .map(name -> "\"" + name + "\"")
                .collect(Collectors.joining("delimeter"));

        if (!dynamicHeaders.isEmpty()) {
            header += " | " + dynamicHeaders;
        }

        StringBuilder output = new StringBuilder(header + "\n");

        // Processing the content
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].trim().isEmpty()) continue; // Skip empty lines

            // Splitting the line based on '|'
            String[] parts = lines[i].split("\\|");
            StringBuilder formattedLine = new StringBuilder();

            // Process each part of the line
            for (String part : parts) {
                if (formattedLine.length() > 0) formattedLine.append(" | ");
                formattedLine.append(formatForOutput(part));
            }

            // Append fixed values or dynamic data
            formattedLine.append(" delimeter \"0\"");

            // Append more fields dynamically
            String dynamicValues = resultFields.stream()
                    .map(field -> "\"\"")
                    .collect(Collectors.joining(" delimeter "));

            if (!dynamicValues.isEmpty()) {
                formattedLine.append(" delimeter ").append(dynamicValues);
            }

            output.append(formattedLine).append("\n");
        }

        return output.toString();
    }


    private String formatForOutput(String part) {
        return "\"" + part.trim() + "\"";
    }


    @GetMapping ("/getData-by-fileName")
    public ResponseEntity<ProcessFileStoredDto> getDataByFileName(@RequestParam String fileName) throws Exception {
       ProcessFileStoredDto processFileStoredDto =  resultFieldsService.findDataByFileName(fileName);
       return new ResponseEntity<>(processFileStoredDto, HttpStatus.OK);
    }
 public ProcessFileStoredDto findDataByFileName(String filename) throws Exception {
        FileAppendResult fileAppendResult = fIleAppendResultRepository.findBySubmittedFilename(filename);
        int logId = fileAppendResult.getFileAppendQueryLogId();
        FileAppendQueryLog fileAppendQueryLog = fileAppendQueryLogReppository.findById(logId).get();
        ProcessFileStoredDto processFileStoredDto = new ProcessFileStoredDto();
        processFileStoredDto.setSubmitedFileName(fileAppendResult.getSubmittedFilename());
        processFileStoredDto.setStatus(fileAppendResult.getStatus());
        processFileStoredDto.setDate(fileAppendResult.getSubmittedDate());
        processFileStoredDto.setDownloadableFIleLink(fileAppendQueryLog.getFile());
        String xml =fileAppendQueryLog.getQuerySpec();
        QuerySpec q1= fromXml(xml);
        processFileStoredDto.setQuerySpec(q1);
        return processFileStoredDto;
    }


    public QuerySpec fromXml(String xml) throws Exception {
        JAXBContext jaxbContext = JAXBContext.newInstance(QuerySpec.class);
        Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
        StringReader reader = new StringReader(xml);
        return (QuerySpec) unmarshaller.unmarshal(reader);
    }

<filespec><infile format="delimited" delimiter="|" headerrow="true"><column id="0" input="0"/><column id="1" input="1"/><column id="2"/></infile><outfile format="delimited" delimiter="|"><column heading="Phone Nos" column="0"/><column heading="PDE Screen" column="1"/><column heading="ZIP4" column="2"/><column heading="EID 1321 ResultCode" errorcode="1321:ErrorCode"/><column heading="Address Locale" field="1321:Address Locale"/><column heading="Address Return Status" field="1321:Address Return Status"/><column heading="Status Code" field="1321:Status Code"/><column heading="Spatial Key" field="1321:Spatial Key"/><column heading="Lat/Lon Match Precision" field="1321:Lat/Lon Match Precision"/><column heading="Phone Type Code" field="1321:Phone Type Code"/><column heading="Point Code" field="1321:Point Code"/><column heading="TimeZone" field="1321:TimeZone"/><column heading="In NXX Master Source Table" field="1321:In NXX Master Source Table"/><column heading="Dialable" field="1321:Dialable"/><column heading="Day Light Savings" field="1321:Day Light Savings"/><column heading="FIPS Code" field="1321:FIPS Code"/><column heading="OCN" field="1321:OCN"/><column heading="Extended Address Key" field="1321:Extended Address Key"/><column heading="Record Type" field="1321:Record Type"/><column heading="Primary Address Parity" field="1321:Primary Address Parity"/><column heading="Secondary Address Parity" field="1321:Secondary Address Parity"/><column heading="Building Firm Name" field="1321:Building Firm Name"/><column heading="Primary Address Number" field="1321:Primary Address Number"/><column heading="Street Pre-direction" field="1321:Street Pre-direction"/><column heading="Street Name" field="1321:Street Name"/><column heading="Street Type" field="1321:Street Type"/><column heading="Street Post-direction" field="1321:Street Post-direction"/><column heading="Secondary Address Number" field="1321:Secondary Address Number"/><column heading="Secondary Address Type" field="1321:Secondary Address Type"/><column heading="Post Office City Name" field="1321:Post Office City Name"/><column heading="State" field="1321:State"/><column heading="ZIP Code" field="1321:ZIP Code"/><column heading="ZIP+4" field="1321:ZIP+4"/><column heading="Delivery Point Code" field="1321:Delivery Point Code"/><column heading="Name Type" field="1321:Name Type"/><column heading="Last Name" field="1321:Last Name"/><column heading="First Name" field="1321:First Name"/><column heading="Middle Initial" field="1321:Middle Initial"/><column heading="Business Name" field="1321:Business Name"/><column heading="Business Suffix" field="1321:Business Suffix"/><column heading="New NPA" field="1321:New NPA"/><column heading="Carrier Route" field="1321:Carrier Route"/><column heading="Spatially Inconsistent" field="1321:Spatially Inconsistent"/><column heading="Unique Source Flag" field="1321:Unique Source Flag"/><column heading="CAN - Building Firm Name" field="1321:CAN - Building Firm Name"/><column heading="CAN - Route Service Type Desc" field="1321:CAN - Route Service Type Desc"/><column heading="CAN - Route Service Type Number" field="1321:CAN - Route Service Type Number"/><column heading="CAN - Building Number" field="1321:CAN - Building Number"/><column heading="CAN - Street Name" field="1321:CAN - Street Name"/><column heading="CAN - Street Type" field="1321:CAN - Street Type"/><column heading="CAN - Post-direction" field="1321:CAN - Post-direction"/><column heading="CAN - Secondary Address Number" field="1321:CAN - Secondary Address Number"/><column heading="CAN - Secondary Address Type" field="1321:CAN - Secondary Address Type"/><column heading="CAN - Municipality" field="1321:CAN - Municipality"/><column heading="CAN - Province" field="1321:CAN - Province"/><column heading="CAN - FSALDU" field="1321:CAN - FSALDU"/><column heading="CAN - Street Accent Indicator" field="1321:CAN - Street Accent Indicator"/><column heading="CAN - Municipality Accent Indicator" field="1321:CAN - Municipality Accent Indicator"/><column heading="CAN - Province Accent Indicator" field="1321:CAN - Province Accent Indicator"/></outfile></filespec>





 
