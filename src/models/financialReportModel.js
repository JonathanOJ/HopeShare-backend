const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const FINANCE_REPORT_TABLE = process.env.FINANCE_REPORT_TABLE;

const saveReport = async (reportData) => {
  const report = {
    financial_report_id: Date.now().toString(),
    campanha: reportData.campanha,
    user: reportData.user,
    file_url: reportData.file_url,
    file_key: reportData.file_key,
    file_name: reportData.file_name,
    created_at: reportData.created_at || new Date().toISOString(),
    type: reportData.type,
  };

  const params = {
    TableName: FINANCE_REPORT_TABLE,
    Item: report,
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    return report;
  } catch (error) {
    console.error("Erro ao salvar relatório:", error);
    throw new Error(`Não foi possível salvar relatório: ${error.message}`);
  }
};

const findReportById = async (financial_report_id) => {
  const params = {
    TableName: FINANCE_REPORT_TABLE,
    Key: { financial_report_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error("Erro ao buscar relatório:", error);
    return null;
  }
};

const findReportsByCampaignId = async (campanha_id) => {
  const params = {
    TableName: FINANCE_REPORT_TABLE,
    FilterExpression: "campanha.campanha_id = :campanha_id",
    ExpressionAttributeValues: {
      ":campanha_id": campanha_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao buscar relatórios da campanha:", error);
    return [];
  }
};

const findReportsByUserId = async (user_id) => {
  const params = {
    TableName: FINANCE_REPORT_TABLE,
    FilterExpression: "#user.#user_id = :user_id",
    ExpressionAttributeNames: {
      "#user": "user",
      "#user_id": "user_id",
    },
    ExpressionAttributeValues: {
      ":user_id": user_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao buscar relatórios do usuário:", error);
    return [];
  }
};

const deleteReport = async (financial_report_id) => {
  const params = {
    TableName: FINANCE_REPORT_TABLE,
    Key: { financial_report_id },
  };

  try {
    await dynamoDbClient.send(new DeleteCommand(params));
    return true;
  } catch (error) {
    console.error("Erro ao deletar relatório:", error);
    return false;
  }
};

module.exports = {
  saveReport,
  findReportById,
  findReportsByCampaignId,
  findReportsByUserId,
  deleteReport,
};
