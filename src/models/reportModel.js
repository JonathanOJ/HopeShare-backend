const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const REPORTS_TABLE = process.env.REPORTS_TABLE;

const reportCampanha = async (campanha, user, reason, description) => {
  const dateUTC = new Date().toISOString();
  const newReportId = Date.now().toString();

  const newReport = {
    report_id: newReportId,
    campanha,
    user,
    reason,
    description,
    status: "PENDING",
    created_at: dateUTC,
  };

  const params = {
    TableName: REPORTS_TABLE,
    Item: newReport,
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    return newReport;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getDenuncias = async () => {
  const params = {
    TableName: REPORTS_TABLE,
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const updateDenunciaStatus = async (report_id, status) => {
  const params = {
    TableName: REPORTS_TABLE,
    Key: { report_id },
    UpdateExpression: "set #s = :s",
    ExpressionAttributeNames: {
      "#s": "status",
    },
    ExpressionAttributeValues: {
      ":s": status,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  reportCampanha,
  getDenuncias,
  updateDenunciaStatus,
};
