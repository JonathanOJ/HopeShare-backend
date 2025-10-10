const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: "us-east-1" }); // ou process.env.AWS_REGION
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE;

const findByEmail = async (email) => {
  const params = {
    TableName: USERS_TABLE,
    IndexName: "email-index",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
    },
  };

  try {
    const result = await dynamoDbClient.send(new QueryCommand(params));
    return result.Items?.[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const findByCpf = async (cpf) => {
  const params = {
    TableName: USERS_TABLE,
    KeyConditionExpression: "cpf = :cpf",
    ExpressionAttributeValues: {
      ":cpf": cpf,
    },
  };

  try {
    const result = await dynamoDbClient.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const findByCnpj = async (cnpj) => {
  const params = {
    TableName: USERS_TABLE,
    KeyConditionExpression: "cnpj = :cnpj",
    ExpressionAttributeValues: {
      ":cnpj": cnpj,
    },
  };

  try {
    const result = await dynamoDbClient.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const signIn = async (user) => {
  const { email, password } = user;

  const params = {
    TableName: USERS_TABLE,
    FilterExpression: "email = :email AND password = :password",
    ExpressionAttributeValues: {
      ":email": email,
      ":password": password,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const findById = async (user_id) => {
  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const createUser = async (user) => {
  const { username, email, image, password, cnpj, cpf, birthdate, type_user } =
    user;
  const dateUTC = new Date().toISOString();
  const newId = Date.now().toString();

  const params = {
    TableName: USERS_TABLE,
    Item: {
      user_id: newId,
      username,
      email,
      image,
      password,
      cnpj: cnpj || null,
      cpf: cpf || null,
      birthdate,
      total_donated: 0,
      total_campanha_donated: 0,
      total_campanha_created: 0,
      created_at: dateUTC,
      type_user,
      admin: false,
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    return {
      user_id: newId,
      username,
      email,
      image,
      birthdate,
      admin: false,
      type_user,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteUser = async (user_id) => {
  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
    ReturnValues: "ALL_OLD",
  };

  try {
    const result = await dynamoDbClient.send(new DeleteCommand(params));
    return result.Attributes ? true : false;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Atualizar dados do usuário
const updateUser = async (user) => {
  const {
    user_id,
    username,
    email,
    image,
    password,
    cnpj,
    cpf,
    birthdate,
    type_user,
  } = user;

  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
    UpdateExpression: `SET
      username = :username,
      email = :email,
      image = :image,
      password = :password,
      cnpj = :cnpj,
      cpf = :cpf,
      birthdate = :birthdate,
      type_user = :type_user`,
    ExpressionAttributeValues: {
      ":username": username,
      ":email": email,
      ":image": image,
      ":password": password,
      ":cnpj": cnpj,
      ":cpf": cpf,
      ":birthdate": birthdate,
      ":type_user": type_user,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Incrementa campanhas criadas
const updateUserCampanhaCreated = async (user_id) => {
  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
    UpdateExpression:
      "SET total_campanha_created = total_campanha_created + :inc",
    ExpressionAttributeValues: {
      ":inc": 1,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Incrementa total doado
const updateTotalDonated = async (body) => {
  const { user_id, donated_value } = body;

  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
    UpdateExpression: "SET total_donated = total_donated + :donated_value",
    ExpressionAttributeValues: {
      ":donated_value": donated_value,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Incrementa campanhas que o usuário doou
const updateTotalCampanhasDonated = async (body) => {
  const { user_id } = body;

  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
    UpdateExpression:
      "SET total_campanha_donated = total_campanha_donated + :inc",
    ExpressionAttributeValues: {
      ":inc": 1,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Pega detalhes de campanhas por ID do usuário
const getDetailsCampanhasByUsuarioId = async (user_id) => {
  const params = {
    TableName: USERS_TABLE,
    Key: { user_id },
    ProjectionExpression:
      "total_donated, total_campanha_donated, total_campanha_created",
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  findByEmail,
  signIn,
  findById,
  createUser,
  deleteUser,
  updateUser,
  updateTotalCampanhasDonated,
  updateUserCampanhaCreated,
  updateTotalDonated,
  getDetailsCampanhasByUsuarioId,
  findByCnpj,
  findByCpf,
};
