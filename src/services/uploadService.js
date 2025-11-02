const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

// Configuração do cliente S3 para Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

const deleteAllUserValidationDocuments = async (user_id) => {
  try {
    const prefix = `validations/${user_id}/`;

    // Lista todos os objetos com o prefixo do usuário
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log(`Nenhum documento encontrado para user_id: ${user_id}`);
      return 0;
    }

    // Deleta todos os arquivos encontrados
    const deletePromises = listResponse.Contents.map((object) => {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: object.Key,
      });
      return s3Client.send(deleteCommand);
    });

    await Promise.all(deletePromises);

    return listResponse.Contents.length;
  } catch (error) {
    throw new Error(`Falha ao deletar documentos: ${error.message}`);
  }
};

const uploadValidationDocuments = async (user_id, documents) => {
  try {
    if (!documents || documents.length === 0) {
      return [];
    }

    const uploadPromises = documents.map(async (doc) => {
      const timestamp = Date.now();
      const sanitizedName = doc.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `validations/${user_id}/${timestamp}-${sanitizedName}`;

      let fileBuffer;
      if (Buffer.isBuffer(doc.file)) {
        fileBuffer = doc.file;
      } else if (typeof doc.file === "string") {
        const base64Data = doc.file.replace(/^data:.*?;base64,/, "");
        fileBuffer = Buffer.from(base64Data, "base64");
      } else {
        throw new Error(`Formato de arquivo inválido para ${doc.name}`);
      }

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: doc.type || "application/octet-stream",
        Metadata: {
          originalName: doc.name,
          userId: user_id,
        },
      });

      await s3Client.send(uploadCommand);

      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

      return {
        name: doc.name,
        url: publicUrl,
        key: key,
        type: doc.type || "application/octet-stream",
      };
    });

    const uploadedDocuments = await Promise.all(uploadPromises);

    return uploadedDocuments;
  } catch (error) {
    throw new Error(`Falha no upload: ${error.message}`);
  }
};

const replaceUserValidationDocuments = async (user_id, documents) => {
  try {
    await deleteAllUserValidationDocuments(user_id);

    const uploadedDocuments = await uploadValidationDocuments(
      user_id,
      documents
    );

    return uploadedDocuments;
  } catch (error) {
    throw new Error(`Falha ao substituir documentos: ${error.message}`);
  }
};

// Funções para upload de imagens de campanhas
const deleteImageCampanha = async (imageKey) => {
  try {
    if (!imageKey) {
      console.log("Nenhuma chave de imagem fornecida para deletar");
      return false;
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: imageKey,
    });

    await s3Client.send(deleteCommand);
    return true;
  } catch (error) {
    console.error(`Erro ao deletar imagem: ${error.message}`);
    throw new Error(`Falha ao deletar imagem: ${error.message}`);
  }
};

const uploadCampanhaImage = async (campanha_id, imageFile) => {
  try {
    if (!imageFile) {
      throw new Error("Nenhum arquivo de imagem fornecido");
    }

    const timestamp = Date.now();
    const sanitizedName = imageFile.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );
    const key = `campanhas/${campanha_id}/${timestamp}-${sanitizedName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageFile.buffer,
      ContentType: imageFile.mimetype,
      Metadata: {
        originalName: imageFile.originalname,
        campanhaId: campanha_id,
      },
    });

    await s3Client.send(uploadCommand);

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

    return {
      url: publicUrl,
      key: key,
    };
  } catch (error) {
    throw new Error(`Falha no upload da imagem: ${error.message}`);
  }
};

const replaceCampanhaImage = async (campanha_id, oldImageKey, newImageFile) => {
  try {
    // Deleta a imagem antiga se existir
    if (oldImageKey) {
      await deleteImageCampanha(oldImageKey);
    }

    // Faz upload da nova imagem
    const uploadResult = await uploadCampanhaImage(campanha_id, newImageFile);

    return uploadResult;
  } catch (error) {
    throw new Error(`Falha ao substituir imagem: ${error.message}`);
  }
};

// ========== UPLOADS DE RELATÓRIOS PDF ==========

const uploadReportPDF = async (fileName, pdfBuffer) => {
  try {
    const key = `reports/${fileName}`;

    // Detecta o tipo de conteúdo pelo nome do arquivo
    const contentType = fileName.endsWith(".csv")
      ? "text/csv; charset=utf-8"
      : fileName.endsWith(".xml")
      ? "application/xml; charset=utf-8"
      : "application/pdf";

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(uploadCommand);

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

    return {
      url: publicUrl,
      key: key,
    };
  } catch (error) {
    throw new Error(`Falha ao fazer upload do arquivo: ${error.message}`);
  }
};

const deleteReportPDF = async (key) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    return true;
  } catch (error) {
    throw new Error(`Falha ao deletar PDF: ${error.message}`);
  }
};

module.exports = {
  deleteAllUserValidationDocuments,
  uploadValidationDocuments,
  replaceUserValidationDocuments,

  deleteImageCampanha,
  uploadCampanhaImage,
  replaceCampanhaImage,

  uploadReportPDF,
  deleteReportPDF,
};
