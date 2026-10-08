-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: punto_de_venta
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cat_regimen_fiscal`
--

DROP TABLE IF EXISTS `cat_regimen_fiscal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_regimen_fiscal` (
  `clave` char(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_regimen_fiscal`
--

LOCK TABLES `cat_regimen_fiscal` WRITE;
/*!40000 ALTER TABLE `cat_regimen_fiscal` DISABLE KEYS */;
INSERT INTO `cat_regimen_fiscal` VALUES ('601','General de Ley Personas Morales'),('603','Personas Morales con Fines no Lucrativos'),('605','Sueldos y Salarios e Ingresos Asimilados a Salarios'),('606','Arrendamiento'),('612','Personas Físicas con Actividades Empresariales y Profesionales'),('616','Sin obligaciones fiscales'),('621','Incorporación Fiscal'),('626','Régimen Simplificado de Confianza');
/*!40000 ALTER TABLE `cat_regimen_fiscal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cat_uso_cfdi`
--

DROP TABLE IF EXISTS `cat_uso_cfdi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cat_uso_cfdi` (
  `clave` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cat_uso_cfdi`
--

LOCK TABLES `cat_uso_cfdi` WRITE;
/*!40000 ALTER TABLE `cat_uso_cfdi` DISABLE KEYS */;
INSERT INTO `cat_uso_cfdi` VALUES ('CP01','Pagos'),('G01','Adquisición de mercancías'),('G02','Devoluciones, descuentos o bonificaciones'),('G03','Gastos en general'),('S01','Sin efectos fiscales');
/*!40000 ALTER TABLE `cat_uso_cfdi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (2,'Bebidas'),(3,'Comida'),(8,'Cuidado personal'),(6,'Herramientas'),(7,'Hogar'),(5,'Limpieza'),(9,'Mascotas'),(10,'Otros'),(1,'Papelería'),(4,'Tecnología');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes_fiscales`
--

DROP TABLE IF EXISTS `clientes_fiscales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes_fiscales` (
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_razon_social` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_postal` char(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `regimen_fiscal` char(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`rfc`),
  KEY `regimen_fiscal` (`regimen_fiscal`),
  CONSTRAINT `clientes_fiscales_ibfk_1` FOREIGN KEY (`regimen_fiscal`) REFERENCES `cat_regimen_fiscal` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes_fiscales`
--

LOCK TABLES `clientes_fiscales` WRITE;
/*!40000 ALTER TABLE `clientes_fiscales` DISABLE KEYS */;
/*!40000 ALTER TABLE `clientes_fiscales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estados_producto`
--

DROP TABLE IF EXISTS `estados_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estados_producto` (
  `id` tinyint unsigned NOT NULL,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estados_producto`
--

LOCK TABLES `estados_producto` WRITE;
/*!40000 ALTER TABLE `estados_producto` DISABLE KEYS */;
INSERT INTO `estados_producto` VALUES (1,'activo'),(2,'archivado'),(0,'inactivo');
/*!40000 ALTER TABLE `estados_producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `facturas`
--

DROP TABLE IF EXISTS `facturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `facturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `folio_factura` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uso_cfdi` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acepta_aviso_privacidad` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('solicitada','emitida','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'solicitada',
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `venta_id` (`venta_id`),
  UNIQUE KEY `folio_factura` (`folio_factura`),
  KEY `rfc` (`rfc`),
  KEY `uso_cfdi` (`uso_cfdi`),
  CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`),
  CONSTRAINT `facturas_ibfk_2` FOREIGN KEY (`rfc`) REFERENCES `clientes_fiscales` (`rfc`),
  CONSTRAINT `facturas_ibfk_3` FOREIGN KEY (`uso_cfdi`) REFERENCES `cat_uso_cfdi` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facturas`
--

LOCK TABLES `facturas` WRITE;
/*!40000 ALTER TABLE `facturas` DISABLE KEYS */;
/*!40000 ALTER TABLE `facturas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lotes_producto`
--

DROP TABLE IF EXISTS `lotes_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lotes_producto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `pedido_detalle_id` int DEFAULT NULL,
  `cantidad` int NOT NULL DEFAULT '0',
  `fecha_caducidad` date DEFAULT NULL,
  `recibido_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('pendiente','registrado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registrado',
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  KEY `pedido_detalle_id` (`pedido_detalle_id`),
  CONSTRAINT `lotes_producto_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lotes_producto_ibfk_2` FOREIGN KEY (`pedido_detalle_id`) REFERENCES `pedido_detalle` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_lote_cantidad` CHECK ((`cantidad` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lotes_producto`
--

LOCK TABLES `lotes_producto` WRITE;
/*!40000 ALTER TABLE `lotes_producto` DISABLE KEYS */;
INSERT INTO `lotes_producto` VALUES (1,1,NULL,149,NULL,'2026-10-01 11:22:34','registrado'),(2,6,NULL,14,NULL,'2026-10-01 11:22:34','registrado'),(4,6,NULL,50,'2035-10-15','2026-10-01 11:37:03','registrado'),(5,2,NULL,90,NULL,'2026-10-01 19:09:05','registrado'),(6,3,NULL,25,NULL,'2026-10-01 19:09:05','registrado'),(7,4,NULL,120,NULL,'2026-10-01 19:09:05','registrado'),(8,5,NULL,68,NULL,'2026-10-01 19:09:05','registrado'),(9,7,NULL,109,NULL,'2026-10-01 19:09:05','registrado'),(10,8,NULL,40,NULL,'2026-10-01 19:09:05','registrado'),(11,9,NULL,52,NULL,'2026-10-01 19:09:05','registrado'),(12,10,NULL,78,NULL,'2026-10-01 19:09:05','registrado'),(13,11,NULL,35,NULL,'2026-10-01 19:09:05','registrado'),(14,12,NULL,45,NULL,'2026-10-01 19:09:05','registrado'),(15,13,NULL,64,NULL,'2026-10-01 19:09:05','registrado'),(16,14,NULL,46,NULL,'2026-10-01 19:09:05','registrado'),(17,15,NULL,37,NULL,'2026-10-01 19:09:05','registrado'),(18,16,NULL,86,NULL,'2026-10-01 19:09:05','registrado'),(19,17,NULL,10,NULL,'2026-10-01 19:09:05','registrado'),(20,18,NULL,12,NULL,'2026-10-01 19:09:05','registrado'),(21,19,NULL,28,NULL,'2026-10-01 19:09:05','registrado'),(22,20,NULL,41,NULL,'2026-10-01 19:09:05','registrado'),(23,10,NULL,10,NULL,'2026-10-05 14:34:18','pendiente'),(24,1,NULL,8,NULL,'2026-10-06 08:00:31','pendiente'),(25,15,NULL,10,NULL,'2026-10-06 08:00:31','pendiente'),(26,8,NULL,10,NULL,'2026-10-07 10:04:30','registrado'),(27,2,NULL,10,NULL,'2026-10-07 10:05:06','registrado');
/*!40000 ALTER TABLE `lotes_producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_inventario`
--

DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `tipo_movimiento_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `ubicacion` enum('almacen','mostrador') COLLATE utf8mb4_unicode_ci NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mov_producto_fecha` (`producto_id`,`fecha`),
  KEY `tipo_movimiento_id` (`tipo_movimiento_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `movimientos_inventario_ibfk_2` FOREIGN KEY (`tipo_movimiento_id`) REFERENCES `tipos_movimiento` (`id`),
  CONSTRAINT `movimientos_inventario_ibfk_3` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_inventario`
--

LOCK TABLES `movimientos_inventario` WRITE;
/*!40000 ALTER TABLE `movimientos_inventario` DISABLE KEYS */;
INSERT INTO `movimientos_inventario` VALUES (1,2,1,10,'almacen','Reponer',1,'2026-10-07 10:03:14'),(2,8,2,10,'mostrador','Producto dañado',1,'2026-10-07 10:04:30'),(3,2,2,10,'mostrador','Producto dañado',1,'2026-10-07 10:05:06');
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedido_detalle`
--

DROP TABLE IF EXISTS `pedido_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad_solicitada` int NOT NULL,
  `cantidad_recibida` int NOT NULL DEFAULT '0',
  `costo_unitario` decimal(10,2) NOT NULL,
  `estado_linea` varchar(10) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when (`cantidad_recibida` = 0) then _utf8mb4'pendiente' when (`cantidad_recibida` >= `cantidad_solicitada`) then _utf8mb4'completo' else _utf8mb4'incompleto' end)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pedido_producto` (`pedido_id`,`producto_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `pedido_detalle_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pedido_detalle_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `chk_pd_costo` CHECK ((`costo_unitario` >= 0)),
  CONSTRAINT `chk_pd_recibida` CHECK ((`cantidad_recibida` >= 0)),
  CONSTRAINT `chk_pd_solicitada` CHECK ((`cantidad_solicitada` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedido_detalle`
--

LOCK TABLES `pedido_detalle` WRITE;
/*!40000 ALTER TABLE `pedido_detalle` DISABLE KEYS */;
INSERT INTO `pedido_detalle` (`id`, `pedido_id`, `producto_id`, `cantidad_solicitada`, `cantidad_recibida`, `costo_unitario`) VALUES (1,1,1,50,50,10.00),(2,2,1,30,0,10.00),(4,3,6,15,15,10.00),(5,6,10,10,10,20.00),(6,7,15,10,10,10.00),(7,7,1,10,8,10.00);
/*!40000 ALTER TABLE `pedido_detalle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proveedor_id` int NOT NULL,
  `fecha` datetime NOT NULL,
  `destino` enum('almacen','mostrador') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'almacen',
  `estado` enum('pendiente','en_transito','incompleto','recibido','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_recepcion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `folio` (`folio`),
  KEY `proveedor_id` (`proveedor_id`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (1,'OC-2026-001',1,'2026-09-23 17:37:36','almacen','recibido','2026-09-30 07:34:41'),(2,'OC-2026-002',2,'2026-09-23 17:37:36','almacen','pendiente',NULL),(3,'OC-2026-8973',2,'2026-09-30 09:07:49','almacen','recibido','2026-09-30 09:08:00'),(6,'OC-2026-9508',5,'2026-10-05 14:29:40','almacen','recibido','2026-10-05 14:34:18'),(7,'OC-2026-1225',2,'2026-10-06 08:00:21','almacen','incompleto','2026-10-06 08:00:31');
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `producto_proveedor`
--

DROP TABLE IF EXISTS `producto_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_proveedor` (
  `producto_id` int NOT NULL,
  `proveedor_id` int NOT NULL,
  PRIMARY KEY (`producto_id`,`proveedor_id`),
  KEY `proveedor_id` (`proveedor_id`),
  CONSTRAINT `producto_proveedor_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `producto_proveedor_ibfk_2` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `producto_proveedor`
--

LOCK TABLES `producto_proveedor` WRITE;
/*!40000 ALTER TABLE `producto_proveedor` DISABLE KEYS */;
INSERT INTO `producto_proveedor` VALUES (2,1),(3,1),(4,1),(5,1),(1,2),(15,2),(16,2),(6,4),(7,5),(8,5),(9,5),(10,5),(11,5),(12,5),(20,5),(13,6),(14,6),(17,7),(18,7),(19,7),(22,7);
/*!40000 ALTER TABLE `producto_proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_barras` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_id` int NOT NULL,
  `presentacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidad_medida_id` int NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock_mostrador` int NOT NULL DEFAULT '0',
  `estado_id` tinyint unsigned NOT NULL DEFAULT '1',
  `ubicacion_id` int DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_barras` (`codigo_barras`),
  KEY `categoria_id` (`categoria_id`),
  KEY `unidad_medida_id` (`unidad_medida_id`),
  KEY `estado_id` (`estado_id`),
  KEY `ubicacion_id` (`ubicacion_id`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`),
  CONSTRAINT `productos_ibfk_3` FOREIGN KEY (`estado_id`) REFERENCES `estados_producto` (`id`),
  CONSTRAINT `productos_ibfk_4` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_producto_mostrador` CHECK ((`stock_mostrador` >= 0)),
  CONSTRAINT `chk_producto_precio` CHECK ((`precio` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'Agua Mineral 600ml','7501234500016',2,'Botella',1,15.00,0,1,NULL,'2026-09-22 08:11:59',1),(2,'Cuaderno profesional','7501234500023',1,'100 hojas',1,38.50,25,1,NULL,'2026-10-01 19:09:05',1),(3,'Bolígrafo azul','7501234500030',1,'Punto mediano',1,8.00,60,1,1,'2026-10-01 19:09:05',1),(4,'Lápiz HB','7501234500047',1,'Unidad',1,5.50,80,1,NULL,'2026-10-01 19:09:05',1),(5,'Borrador blanco','7501234500054',1,'Unidad',1,6.50,40,1,NULL,'2026-10-01 19:09:05',1),(6,'Poco x7 PRO','1234567891234',4,'Telefono mediano',1,5999.00,7,1,NULL,'2026-09-30 07:25:34',1),(7,'Marcador permanente negro','7501234500078',1,'Unidad',1,19.00,18,1,NULL,'2026-10-01 19:09:05',1),(8,'Resaltador amarillo','7501234500085',1,'Unidad',1,14.00,20,1,NULL,'2026-10-01 19:09:05',1),(9,'Carpeta tamaño carta','7501234500092',1,'Tamaño carta',1,22.00,20,1,NULL,'2026-10-01 19:09:05',1),(10,'Hojas blancas','7501234500108',1,'Paquete 100 hojas',2,35.00,15,1,NULL,'2026-10-01 19:09:05',1),(11,'Pegamento en barra','7501234500115',1,'21 g',1,17.50,22,1,NULL,'2026-10-01 19:09:05',1),(12,'Tijeras escolares','7501234500122',1,'13 cm',1,25.00,12,1,NULL,'2026-10-01 19:09:05',1),(13,'Agua natural 1 L','7501234500139',2,'Botella',1,18.00,34,1,NULL,'2026-10-01 19:09:05',1),(14,'Jugo de naranja 500 ml','7501234500146',2,'Botella',1,23.00,19,1,NULL,'2026-10-01 19:09:05',1),(15,'Galletas integrales','7501234500153',3,'Paquete',1,16.00,25,1,NULL,'2026-10-01 19:09:05',1),(16,'Papas clásicas','7501234500160',3,'Bolsa 45 g',1,18.50,20,1,NULL,'2026-10-01 19:09:05',1),(17,'Audífonos alámbricos','7501234500177',4,'Cable 1.2 m',1,149.00,8,1,NULL,'2026-10-01 19:09:05',1),(18,'Cable USB-C','7501234500184',4,'1 metro',1,89.00,10,1,NULL,'2026-10-01 19:09:05',1),(19,'Memoria USB 32 GB','7501234500191',4,'32 GB',1,129.00,5,1,NULL,'2026-10-01 19:09:05',1),(20,'Cinta adhesiva','7501234500207',1,'Rollo',1,12.00,26,1,NULL,'2026-10-01 19:09:05',1),(22,'Samsung Tab A7 Lite','1234567894321',4,'9 pulgadas',1,2500.00,0,1,NULL,'2026-10-05 13:52:03',1);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedor_correos`
--

DROP TABLE IF EXISTS `proveedor_correos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor_correos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proveedor_id` int NOT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_proveedor_correo` (`proveedor_id`,`correo`),
  CONSTRAINT `proveedor_correos_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedor_correos`
--

LOCK TABLES `proveedor_correos` WRITE;
/*!40000 ALTER TABLE `proveedor_correos` DISABLE KEYS */;
INSERT INTO `proveedor_correos` VALUES (1,4,'pepilindro@uv.us',1),(2,1,'ventas@centralpapelera.com',1),(3,1,'pedidos@centralpapelera.com',0),(4,2,'contacto@golfo.com',1),(5,5,'ventas@papeleriacentro.es',1),(6,5,'pedidos@papeleriacentro.es',0),(7,6,'contacto@bebidasxalapa.mx',1),(8,6,'ventas@bebidasxalapa.mx',0),(9,7,'ventas@tecnomx.es',1),(11,8,'americadistribuitors@mail.com',1),(12,8,'hola@mail.com',0);
/*!40000 ALTER TABLE `proveedor_correos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedor_telefonos`
--

DROP TABLE IF EXISTS `proveedor_telefonos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor_telefonos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proveedor_id` int NOT NULL,
  `telefono` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('oficina','celular','whatsapp','otro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'oficina',
  `es_principal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_proveedor_telefono` (`proveedor_id`,`telefono`),
  CONSTRAINT `proveedor_telefonos_ibfk_1` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedor_telefonos`
--

LOCK TABLES `proveedor_telefonos` WRITE;
/*!40000 ALTER TABLE `proveedor_telefonos` DISABLE KEYS */;
INSERT INTO `proveedor_telefonos` VALUES (1,4,'2282782080','oficina',1),(2,4,'1234568912','whatsapp',0),(3,1,'2282759153','oficina',1),(4,1,'2281467925','whatsapp',0),(5,2,'2282765213','oficina',1),(6,2,'2282641985','celular',0),(7,5,'2283680650','oficina',1),(8,5,'2283050623','whatsapp',0),(9,5,'2283016235','celular',0),(10,6,'2284354386','oficina',1),(11,6,'2287638453','whatsapp',0),(12,7,'2285652386','oficina',1),(14,8,'2284022924','celular',1);
/*!40000 ALTER TABLE `proveedor_telefonos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `calle` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `colonia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_postal` char(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores`
--

LOCK TABLES `proveedores` WRITE;
/*!40000 ALTER TABLE `proveedores` DISABLE KEYS */;
INSERT INTO `proveedores` VALUES (1,'Distribuidora Central Papelera S.A.',NULL,NULL,NULL,NULL,NULL,1),(2,'Abarrotes y Suministros del Golfo',NULL,NULL,NULL,NULL,NULL,1),(3,'Comercializadora Universitaria UV',NULL,NULL,NULL,NULL,NULL,0),(4,'Deicbi','Carolino Anaya',NULL,NULL,NULL,NULL,1),(5,'Papelería del Centro',NULL,'Centro','Xalapa','Veracruz',NULL,1),(6,'Bebidas y Consumo Xalapa',NULL,'Zona comercial','Xalapa','Veracruz',NULL,1),(7,'Tecnología y Accesorios MX',NULL,NULL,'Xalapa','Veracruz',NULL,1),(8,'Distribuidora Americana','En su casa',NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `proveedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'administrador'),(3,'almacenista'),(2,'cajero');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_movimiento`
--

DROP TABLE IF EXISTS `tipos_movimiento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_movimiento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_movimiento`
--

LOCK TABLES `tipos_movimiento` WRITE;
/*!40000 ALTER TABLE `tipos_movimiento` DISABLE KEYS */;
INSERT INTO `tipos_movimiento` VALUES (1,'mover_mostrador','Transferencia de almacén a mostrador'),(2,'regresar_almacen','Regreso de mostrador a almacén'),(3,'merma','Merma'),(4,'daño','Producto dañado'),(5,'conteo_mostrador','Ajuste por conteo en mostrador'),(6,'lote_agregado','Lote agregado'),(7,'lote_editado','Lote editado'),(8,'lote_eliminado','Lote eliminado');
/*!40000 ALTER TABLE `tipos_movimiento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ubicaciones`
--

DROP TABLE IF EXISTS `ubicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ubicaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `area` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pasillo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seccion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ubicacion` (`area`,`pasillo`,`seccion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ubicaciones`
--

LOCK TABLES `ubicaciones` WRITE;
/*!40000 ALTER TABLE `ubicaciones` DISABLE KEYS */;
INSERT INTO `ubicaciones` VALUES (1,'Almacén Principal','B','4');
/*!40000 ALTER TABLE `ubicaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `unidades_medida`
--

DROP TABLE IF EXISTS `unidades_medida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_medida` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `unidades_medida`
--

LOCK TABLES `unidades_medida` WRITE;
/*!40000 ALTER TABLE `unidades_medida` DISABLE KEYS */;
INSERT INTO `unidades_medida` VALUES (2,'Paquete'),(1,'Pieza');
/*!40000 ALTER TABLE `unidades_medida` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol_id` tinyint unsigned NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`),
  KEY `rol_id` (`rol_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Administrador','admin@uv.mx','123456789',1,1,'2026-09-22 08:11:59'),(2,'Cajero 01','caja01@uv.mx','123456789',2,1,'2026-09-22 08:11:59'),(3,'Almacenista','almacen@uv.mx','123456789',3,1,'2026-09-22 08:11:59'),(4,'Cajero P','p@uv.mx','123456789',2,1,'2026-09-22 09:26:00'),(5,'Cajero 02','caja02@uv.mx','123456789',2,1,'2026-10-01 19:09:05'),(6,'Cajero 03','caja03@uv.mx','123456789',2,1,'2026-10-01 19:09:05'),(7,'Almacenista 02','almacen02@uv.mx','123456789',3,1,'2026-10-01 19:09:05');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_productos`
--

DROP TABLE IF EXISTS `v_productos`;
/*!50001 DROP VIEW IF EXISTS `v_productos`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_productos` AS SELECT 
 1 AS `id`,
 1 AS `nombre`,
 1 AS `codigo_barras`,
 1 AS `categoria`,
 1 AS `presentacion`,
 1 AS `unidad_medida`,
 1 AS `precio`,
 1 AS `stock_almacen`,
 1 AS `stock_mostrador`,
 1 AS `estado`,
 1 AS `area`,
 1 AS `pasillo`,
 1 AS `seccion`,
 1 AS `creado_en`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_stock_almacen`
--

DROP TABLE IF EXISTS `v_stock_almacen`;
/*!50001 DROP VIEW IF EXISTS `v_stock_almacen`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_stock_almacen` AS SELECT 
 1 AS `producto_id`,
 1 AS `stock_almacen`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_ventas`
--

DROP TABLE IF EXISTS `v_ventas`;
/*!50001 DROP VIEW IF EXISTS `v_ventas`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ventas` AS SELECT 
 1 AS `id`,
 1 AS `folio`,
 1 AS `usuario_id`,
 1 AS `fecha`,
 1 AS `metodo_pago`,
 1 AS `num_autorizacion`,
 1 AS `subtotal`,
 1 AS `descuentos`,
 1 AS `iva`,
 1 AS `folio_facturacion`,
 1 AS `estado_facturacion`,
 1 AS `total`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `venta_detalle`
--

DROP TABLE IF EXISTS `venta_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venta_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `descuento_tipo` enum('porcentaje','monto') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monto',
  `descuento_valor` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal_linea` decimal(10,2) GENERATED ALWAYS AS (round((`cantidad` * `precio_unitario`),2)) VIRTUAL,
  `descuento_linea` decimal(10,2) GENERATED ALWAYS AS ((case when (`descuento_tipo` = _utf8mb4'porcentaje') then round((((`cantidad` * `precio_unitario`) * `descuento_valor`) / 100),2) else `descuento_valor` end)) VIRTUAL,
  `total_linea` decimal(10,2) GENERATED ALWAYS AS ((`subtotal_linea` - `descuento_linea`)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_venta_producto` (`venta_id`,`producto_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `venta_detalle_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `venta_detalle_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `chk_vd_cantidad` CHECK ((`cantidad` > 0)),
  CONSTRAINT `chk_vd_descuento` CHECK (((`descuento_valor` >= 0) and (((`descuento_tipo` = _utf8mb4'porcentaje') and (`descuento_valor` <= 100)) or ((`descuento_tipo` = _utf8mb4'monto') and (`descuento_valor` <= (`cantidad` * `precio_unitario`)))))),
  CONSTRAINT `chk_vd_precio` CHECK ((`precio_unitario` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venta_detalle`
--

LOCK TABLES `venta_detalle` WRITE;
/*!40000 ALTER TABLE `venta_detalle` DISABLE KEYS */;
INSERT INTO `venta_detalle` (`id`, `venta_id`, `producto_id`, `cantidad`, `precio_unitario`, `descuento_tipo`, `descuento_valor`) VALUES (1,1,1,1,15.00,'monto',0.00),(2,2,6,11,5999.00,'monto',0.00),(3,3,2,1,38.50,'monto',0.00),(4,4,3,3,8.00,'monto',0.00),(5,5,10,1,35.00,'monto',0.00),(6,6,17,1,149.00,'monto',0.00),(7,7,4,2,5.50,'monto',0.00),(8,7,8,2,14.00,'monto',0.00),(9,8,16,1,18.50,'monto',0.00),(10,9,19,1,129.00,'monto',0.00),(11,10,13,1,18.00,'monto',0.00),(12,10,15,1,16.00,'monto',0.00),(13,10,11,1,17.50,'monto',0.00),(14,11,15,2,16.00,'monto',0.00),(15,11,16,1,18.50,'monto',0.00),(16,16,13,1,18.00,'monto',0.00),(17,16,14,1,23.00,'monto',0.00),(18,17,19,1,129.00,'monto',0.00),(19,17,15,1,16.00,'monto',0.00),(20,18,16,1,18.50,'monto',0.00),(21,19,16,1,18.50,'monto',0.00),(22,20,16,1,18.50,'monto',0.00);
/*!40000 ALTER TABLE `venta_detalle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ventas`
--

DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `metodo_pago` enum('efectivo','tarjeta','transferencia') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'efectivo',
  `num_autorizacion` varchar(6) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `folio_facturacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_facturacion` enum('sin_facturar','solicitada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sin_facturar',
  PRIMARY KEY (`id`),
  UNIQUE KEY `folio` (`folio`),
  UNIQUE KEY `num_autorizacion` (`num_autorizacion`),
  KEY `idx_ventas_fecha` (`fecha`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `chk_autorizacion_efectivo` CHECK (((`metodo_pago` <> _utf8mb4'efectivo') or (`num_autorizacion` is null)))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
INSERT INTO `ventas` VALUES (1,'V-2026-001',2,'2026-09-30 08:54:53','efectivo',NULL,NULL,'sin_facturar'),(2,'V-2026-002',2,'2026-09-30 08:58:12','efectivo',NULL,NULL,'sin_facturar'),(3,'V-2026-003',4,'2026-09-30 09:10:00','efectivo',NULL,NULL,'sin_facturar'),(4,'V-2026-004',2,'2026-09-30 09:25:00','tarjeta',NULL,NULL,'sin_facturar'),(5,'V-2026-005',5,'2026-10-01 10:00:00','efectivo',NULL,NULL,'sin_facturar'),(6,'V-2026-006',6,'2026-10-01 10:35:00','transferencia',NULL,NULL,'sin_facturar'),(7,'V-2026-007',4,'2026-10-01 11:05:00','tarjeta',NULL,NULL,'sin_facturar'),(8,'V-2026-008',2,'2026-09-30 11:40:00','efectivo',NULL,NULL,'sin_facturar'),(9,'V-2026-009',5,'2026-10-01 12:15:00','tarjeta',NULL,NULL,'sin_facturar'),(10,'V-2026-010',6,'2026-10-01 13:00:00','efectivo',NULL,NULL,'sin_facturar'),(11,'VTA-2026-00011',2,'2026-10-05 12:11:41','efectivo',NULL,NULL,'sin_facturar'),(16,'VTA-2026-00016',1,'2026-10-06 07:51:41','efectivo',NULL,'F1B9-252C-2026','sin_facturar'),(17,'VTA-2026-00017',1,'2026-10-06 08:01:24','tarjeta','648256','4244-4227-2026','sin_facturar'),(18,'VTA-2026-00018',1,'2026-10-06 08:02:05','transferencia',NULL,'0364-95ED-2026','sin_facturar'),(19,'VTA-2026-00019',1,'2026-10-06 08:02:16','efectivo',NULL,'6276-DD8B-2026','sin_facturar'),(20,'VTA-2026-00020',1,'2026-10-06 08:02:28','efectivo',NULL,'DA47-156E-2026','sin_facturar');
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_productos`
--

/*!50001 DROP VIEW IF EXISTS `v_productos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_productos` AS select `p`.`id` AS `id`,`p`.`nombre` AS `nombre`,`p`.`codigo_barras` AS `codigo_barras`,`c`.`nombre` AS `categoria`,`p`.`presentacion` AS `presentacion`,`u`.`nombre` AS `unidad_medida`,`p`.`precio` AS `precio`,`s`.`stock_almacen` AS `stock_almacen`,`p`.`stock_mostrador` AS `stock_mostrador`,`e`.`nombre` AS `estado`,`ub`.`area` AS `area`,`ub`.`pasillo` AS `pasillo`,`ub`.`seccion` AS `seccion`,`p`.`creado_en` AS `creado_en` from (((((`productos` `p` join `categorias` `c` on((`c`.`id` = `p`.`categoria_id`))) join `unidades_medida` `u` on((`u`.`id` = `p`.`unidad_medida_id`))) join `estados_producto` `e` on((`e`.`id` = `p`.`estado_id`))) join `v_stock_almacen` `s` on((`s`.`producto_id` = `p`.`id`))) left join `ubicaciones` `ub` on((`ub`.`id` = `p`.`ubicacion_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_stock_almacen`
--

/*!50001 DROP VIEW IF EXISTS `v_stock_almacen`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_stock_almacen` AS select `p`.`id` AS `producto_id`,coalesce(sum(`l`.`cantidad`),0) AS `stock_almacen` from (`productos` `p` left join `lotes_producto` `l` on(((`l`.`producto_id` = `p`.`id`) and (`l`.`estado` = 'registrado')))) group by `p`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ventas`
--

/*!50001 DROP VIEW IF EXISTS `v_ventas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ventas` AS select `x`.`id` AS `id`,`x`.`folio` AS `folio`,`x`.`usuario_id` AS `usuario_id`,`x`.`fecha` AS `fecha`,`x`.`metodo_pago` AS `metodo_pago`,`x`.`num_autorizacion` AS `num_autorizacion`,`x`.`subtotal` AS `subtotal`,`x`.`descuentos` AS `descuentos`,`x`.`iva` AS `iva`,`x`.`folio_facturacion` AS `folio_facturacion`,`x`.`estado_facturacion` AS `estado_facturacion`,round(((`x`.`subtotal` - `x`.`descuentos`) + `x`.`iva`),2) AS `total` from (select `v`.`id` AS `id`,`v`.`folio` AS `folio`,`v`.`usuario_id` AS `usuario_id`,`v`.`fecha` AS `fecha`,`v`.`metodo_pago` AS `metodo_pago`,`v`.`num_autorizacion` AS `num_autorizacion`,coalesce(`t`.`subtotal`,0) AS `subtotal`,coalesce(`t`.`descuentos`,0) AS `descuentos`,round(((coalesce(`t`.`subtotal`,0) - coalesce(`t`.`descuentos`,0)) * 0.16),2) AS `iva`,`f`.`folio_factura` AS `folio_facturacion`,if((`f`.`id` is null),'sin_facturar','solicitada') AS `estado_facturacion` from ((`ventas` `v` left join (select `venta_detalle`.`venta_id` AS `venta_id`,sum(`venta_detalle`.`subtotal_linea`) AS `subtotal`,sum(`venta_detalle`.`descuento_linea`) AS `descuentos` from `venta_detalle` group by `venta_detalle`.`venta_id`) `t` on((`t`.`venta_id` = `v`.`id`))) left join `facturas` `f` on((`f`.`venta_id` = `v`.`id`)))) `x` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-07 18:34:46
