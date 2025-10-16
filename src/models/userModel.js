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
const bcrypt = require("bcryptjs");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE;
const sanitizeDocument = (document) => {
  if (!document) return null;
  return document.replace(/\D/g, "");
};

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
  const sanitizedCpf = sanitizeDocument(cpf);

  if (!sanitizedCpf || sanitizedCpf.trim() === "") {
    return null;
  }

  const params = {
    TableName: USERS_TABLE,
    IndexName: "cpf-index",
    KeyConditionExpression: "cpf = :cpf",
    ExpressionAttributeValues: {
      ":cpf": sanitizedCpf,
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
  const sanitizedCnpj = sanitizeDocument(cnpj);

  if (!sanitizedCnpj || sanitizedCnpj.trim() === "") {
    return null;
  }

  const params = {
    TableName: USERS_TABLE,
    IndexName: "cnpj-index",
    KeyConditionExpression: "cnpj = :cnpj",
    ExpressionAttributeValues: {
      ":cnpj": sanitizedCnpj,
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

  try {
    const foundUser = await findByEmail(email);

    if (!foundUser) {
      return null;
    }

    // Compara a senha fornecida com a senha criptografada
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);

    if (!isPasswordValid) {
      return null;
    }

    return foundUser;
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

  // Criptografa a senha
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const item = {
    user_id: newId,
    username,
    email,
    image,
    password: hashedPassword,
    birthdate,
    total_donated: 0,
    total_campanha_donated: 0,
    total_campanha_created: 0,
    created_at: dateUTC,
    type_user,
    admin: false,
  };

  const sanitizedCpf = sanitizeDocument(cpf);
  if (sanitizedCpf && sanitizedCpf.trim() !== "") {
    item.cpf = sanitizedCpf;
  }

  const sanitizedCnpj = sanitizeDocument(cnpj);
  if (sanitizedCnpj && sanitizedCnpj.trim() !== "") {
    item.cnpj = sanitizedCnpj;
  }

  const params = {
    TableName: USERS_TABLE,
    Item: item,
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
      cnpj: sanitizedCnpj || null,
      cpf: sanitizedCpf || null,
      created_at: dateUTC,
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

  const sanitizedCpf = sanitizeDocument(cpf);
  const sanitizedCnpj = sanitizeDocument(cnpj);

  let hashedPassword = password;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

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
      ":password": hashedPassword,
      ":cnpj": sanitizedCnpj,
      ":cpf": sanitizedCpf,
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
