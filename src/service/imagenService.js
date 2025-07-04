const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { config } = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const IMAGES_FOLDER = process.env.S3_IMAGES_FOLDER || 'recetas/';
const ALLOWED_TYPES = process.env.ALLOWED_FILE_TYPES?.split(',') || [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
];
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5MB

class ImageService {
  static validateImage(file) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido. Tipos válidos: ${ALLOWED_TYPES.join(', ')}`
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Archivo demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    return { valid: true };
  }
  
  static generateImageKey(originalName) {
    const extension = path.extname(originalName);
    const uniqueName = `${uuidv4()}${extension}`;
    return `${IMAGES_FOLDER}${uniqueName}`;
  }

  static async getImageUrl(imageKey) {
    if (!imageKey) return null;
    
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey
      });

      const response = await s3Client.send(command);
      
      const region = process.env.AWS_REGION || 'us-east-1';
      return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${imageKey}`;
      
    } catch (error) {
      console.error('Error al verificar imagen:', error);
      return null;
    }
  }

  static generateImageUrl(imageKey) {
    if (!imageKey) return null;
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${imageKey}`;
  }

  static async uploadImage(file) {
    try {
      console.log('🔍 Subiendo imagen de receta...');
      
      const validation = this.validateImage(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const imageKey = this.generateImageKey(file.originalname);

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          type: 'receta_image'
        }
      });

      await s3Client.send(uploadCommand);

      const imageUrl = this.generateImageUrl(imageKey);

      console.log('✅ Imagen de receta subida exitosamente:', imageKey);

      return {
        success: true,
        imageUrl,
        imageKey
      };

    } catch (error) {
      console.error('❌ Error al subir imagen de receta:', error);
      return {
        success: false,
        error: `Error interno del servidor al subir la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  static async uploadBase64Image(base64String) {
    try {
      console.log('🔍 Procesando imagen Base64 para receta...');
      
      if (!base64String || base64String.trim() === '') {
        console.error('❌ Cadena Base64 vacía');
        return {
          success: false,
          error: "Cadena Base64 vacía"
        };
      }

      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        console.error('❌ Formato Base64 inválido');
        return {
          success: false,
          error: "Formato de imagen base64 inválido. Debe ser: data:image/tipo;base64,datos"
        };
      }

      const mimeType = matches[1];
      const imageData = matches[2];
      
      console.log('🔍 Tipo MIME detectado:', mimeType);

      if (!ALLOWED_TYPES.includes(mimeType)) {
        console.error('❌ Tipo de archivo no permitido:', mimeType);
        return {
          success: false,
          error: `Tipo de archivo no permitido: ${mimeType}. Tipos válidos: ${ALLOWED_TYPES.join(', ')}`
        };
      }

      let imageBuffer;
      try {
        imageBuffer = Buffer.from(imageData, 'base64');
      } catch (bufferError) {
        console.error('❌ Error convirtiendo Base64 a Buffer:', bufferError);
        return {
          success: false,
          error: "Error al decodificar datos Base64"
        };
      }
      
      console.log('🔍 Tamaño del buffer:', imageBuffer.length, 'bytes');

      if (imageBuffer.length > MAX_FILE_SIZE) {
        const sizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
        const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(2);
        console.error(`❌ Archivo demasiado grande: ${sizeMB}MB > ${maxSizeMB}MB`);
        return {
          success: false,
          error: `Archivo demasiado grande: ${sizeMB}MB. Tamaño máximo: ${maxSizeMB}MB`
        };
      }

      const extension = mimeType.split('/')[1];
      const imageKey = `${IMAGES_FOLDER}${uuidv4()}.${extension}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey,
        Body: imageBuffer,
        ContentType: mimeType,
        Metadata: {
          originalName: `receta_image.${extension}`,
          uploadedAt: new Date().toISOString(),
          source: 'base64_upload',
          type: 'receta_image',
          size: imageBuffer.length.toString()
        }
      });

      console.log('🔍 Subiendo imagen de receta a S3...');
      await s3Client.send(uploadCommand);

      const imageUrl = this.generateImageUrl(imageKey);
      
      console.log('✅ Imagen Base64 de receta subida exitosamente');
      console.log('✅ URL generada:', imageUrl);

      return {
        success: true,
        imageUrl,
        imageKey
      };

    } catch (error) {
      console.error('❌ Error subiendo imagen base64 de receta:', error);
      
      let errorMessage = 'Error interno del servidor al subir la imagen';
      
      if (error instanceof Error) {
        if (error.message.includes('AccessDenied')) {
          errorMessage = 'Error de permisos en S3. Verificar credenciales AWS.';
        } else if (error.message.includes('NoSuchBucket')) {
          errorMessage = `Bucket de S3 no encontrado: ${BUCKET_NAME}`;
        } else if (error.message.includes('NetworkError') || error.message.includes('ENOTFOUND')) {
          errorMessage = 'Error de conexión con AWS S3';
        } else if (error.message.includes('InvalidAccessKeyId')) {
          errorMessage = 'Credenciales AWS inválidas';
        } else {
          errorMessage = `Error AWS: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static isValidBase64Image(base64String) {
    if (!base64String) return false;
    
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return false;
    
    const mimeType = matches[1];
    return ALLOWED_TYPES.includes(mimeType);
  }

  static extractKeyFromS3Url(s3Url) {
    try {
      if (!s3Url || !s3Url.includes('amazonaws.com')) {
        return null;
      }

      console.log('🔍 Extrayendo key de URL:', s3Url);

      const bucketPattern = new RegExp(`https://${BUCKET_NAME}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
      const match = s3Url.match(bucketPattern);
      
      if (match && match[1]) {
        const extractedKey = match[1];
        console.log('✅ Key extraído:', extractedKey);
        return extractedKey;
      }

      const urlParts = s3Url.split('/');
      const amazonIndex = urlParts.findIndex(part => part.includes('amazonaws.com'));
      
      if (amazonIndex !== -1 && amazonIndex < urlParts.length - 1) {
        const keyParts = urlParts.slice(amazonIndex + 1);
        const extractedKey = keyParts.join('/');
        console.log('✅ Key extraído (método alternativo):', extractedKey);
        return extractedKey;
      }
      
      console.log('⚠️ No se pudo extraer key de la URL');
      return null;
    } catch (error) {
      console.error('❌ Error extrayendo key de URL:', error);
      return null;
    }
  }

  static async deleteImage(imageKey) {
    try {
      if (!imageKey) {
        return {
          success: false,
          error: 'Key de imagen no proporcionado'
        };
      }

      console.log('🔍 Eliminando imagen de receta de S3:', imageKey);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey
      });

      await s3Client.send(deleteCommand);

      console.log('✅ Imagen de receta eliminada de S3 exitosamente:', imageKey);
      return { success: true };

    } catch (error) {
      console.error('❌ Error eliminando imagen de receta de S3:', error);
      
      let errorMessage = 'Error al eliminar la imagen';
      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey')) {
          console.log('⚠️ La imagen ya no existe en S3:', imageKey);
          return { success: true }; 
        }
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async imageExists(imageKey) {
    try {
      if (!imageKey) return false;

      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: imageKey
      });

      await s3Client.send(command);
      return true;

    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') {
        return false;
      }
      console.error('❌ Error verificando existencia de imagen:', error);
      return false;
    }
  }

  static validateConfiguration() {
    const errors = [];

    if (!process.env.AWS_ACCESS_KEY_ID) {
      errors.push('AWS_ACCESS_KEY_ID no configurado');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      errors.push('AWS_SECRET_ACCESS_KEY no configurado');
    }
    if (!process.env.S3_BUCKET_NAME) {
      errors.push('S3_BUCKET_NAME no configurado');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getBucketInfo() {
    return {
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION || 'us-east-1',
      folder: IMAGES_FOLDER,
      maxSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_TYPES
    };
  }
}

module.exports = ImageService;