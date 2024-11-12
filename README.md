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













 
