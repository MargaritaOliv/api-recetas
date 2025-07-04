const multer = require('multer');
const ImageService = require('../service/imagenService');

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, 
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log(`📄 Procesando archivo: ${file.originalname}, tipo: ${file.mimetype}`);
    
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

const handleRecipeImageUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      console.log('⚠️ No se recibió archivo de imagen');
      return next();
    }

    console.log('🔍 Procesando imagen de receta...');
    
    const uploadResult = await ImageService.uploadImage(req.file);
    
    if (!uploadResult.success) {
      console.error('❌ Error en ImageService:', uploadResult.error);
      return res.status(400).json({
        success: false,
        message: 'Error al subir imagen',
        error: uploadResult.error
      });
    }

    req.imageUpload = {
      imageUrl: uploadResult.imageUrl,
      imageKey: uploadResult.imageKey
    };

    console.log('✅ Imagen procesada exitosamente');
    console.log('✅ URL:', uploadResult.imageUrl);
    next();

  } catch (error) {
    console.error('❌ Error en middleware de imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al procesar imagen',
      error: error.message
    });
  }
};

const handleBase64ImageUpload = async (req, res, next) => {
  try {
    const { imagen_base64 } = req.body;
    
    if (!imagen_base64) {
      console.log('⚠️ No se recibió imagen Base64');
      return next();
    }

    console.log('🔍 Procesando imagen Base64...');
    
    if (!ImageService.isValidBase64Image(imagen_base64)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de imagen Base64 inválido'
      });
    }

    const uploadResult = await ImageService.uploadBase64Image(imagen_base64);
    
    if (!uploadResult.success) {
      console.error('❌ Error en ImageService Base64:', uploadResult.error);
      return res.status(400).json({
        success: false,
        message: 'Error al subir imagen Base64',
        error: uploadResult.error
      });
    }

    req.imageUpload = {
      imageUrl: uploadResult.imageUrl,
      imageKey: uploadResult.imageKey
    };

    delete req.body.imagen_base64;

    console.log('✅ Imagen Base64 procesada exitosamente');
    console.log('✅ URL:', uploadResult.imageUrl);
    next();

  } catch (error) {
    console.error('❌ Error en middleware de imagen Base64:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al procesar imagen Base64',
      error: error.message
    });
  }
};

const cleanupImageOnError = (error, req, res, next) => {
  if (req.imageUpload?.imageKey) {
    console.log('🧹 Limpiando imagen debido a error...');
    ImageService.deleteImage(req.imageUpload.imageKey)
      .then(result => {
        if (result.success) {
          console.log('✅ Imagen limpiada exitosamente');
        } else {
          console.error('❌ Error limpiando imagen:', result.error);
        }
      })
      .catch(cleanupError => {
        console.error('❌ Error en cleanup:', cleanupError);
      });
  }
  
  next(error);
};

const uploadRecipeImage = [
  uploadMiddleware.single('imagen_receta'),
  handleRecipeImageUpload
];

const uploadRecipeBase64 = [
  handleBase64ImageUpload
];

const validateImageServiceConfig = (req, res, next) => {
  const validation = ImageService.validateConfiguration();
  
  if (!validation.valid) {
    console.error('❌ Configuración de ImageService inválida:', validation.errors);
    return res.status(500).json({
      success: false,
      message: 'Error de configuración del servicio de imágenes',
      errors: validation.errors
    });
  }
  
  next();
};

module.exports = {
  uploadMiddleware,
  uploadRecipeImage,
  uploadRecipeBase64,
  handleRecipeImageUpload,
  handleBase64ImageUpload,
  cleanupImageOnError,
  validateImageServiceConfig
};