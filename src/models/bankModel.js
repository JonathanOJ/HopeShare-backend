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

const BANK_TABLE = process.env.BANK_TABLE;

const searchBanks = async (searchBody) => {
  let { search, itemsPerPage } = searchBody;

  const params = {
    TableName: BANK_TABLE,
    ProjectionExpression: "bank_id, #name, fullName",
  };

  params.ExpressionAttributeNames = {
    "#name": "name",
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    let items = result.Items || [];

    if (search && search.trim() !== "") {
      const searchUpper = search.trim().toUpperCase();
      items = items.filter((bank) => {
        const nameMatch = bank.name?.toUpperCase().includes(searchUpper);
        const fullNameMatch = bank.fullName
          ?.toUpperCase()
          .includes(searchUpper);
        const bankIdMatch = bank.bank_id?.toString().includes(search.trim());
        return nameMatch || fullNameMatch || bankIdMatch;
      });
    }

    const limitedItems = items.slice(0, itemsPerPage);

    return limitedItems;
  } catch (error) {
    console.error("Erro ao buscar bancos:", error);
    return [];
  }
};

const getBankById = async (bank_id) => {
  const params = {
    TableName: BANK_TABLE,
    Key: { bank_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error("Erro ao buscar banco:", error);
    return null;
  }
};

module.exports = {
  searchBanks,
  getBankById,
};
