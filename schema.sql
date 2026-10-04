-- ============================================================
-- Esquema de base de datos (MySQL)
-- @author Citlaly Morales Viveros (Cliente / Programadora XP)
-- ============================================================
DROP DATABASE IF EXISTS punto_de_venta;
CREATE DATABASE IF NOT EXISTS punto_de_venta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE punto_de_venta;

-- ------------------------------------------------------------
-- Usuarios / Empleados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo   VARCHAR(150) NOT NULL,
  correo            VARCHAR(255) NOT NULL,
  password          VARCHAR(255) NOT NULL,
  role              ENUM('administrador', 'cajero', 'almacenista') NOT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en         DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY username (correo),
  UNIQUE KEY uq_correo_role (correo, role)
);

-- ------------------------------------------------------------
-- Proveedores / Distribuidores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(150) NOT NULL,
  direccion VARCHAR(255) NULL,
  telefono  VARCHAR(20) NULL,
  email     VARCHAR(100) NULL,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- Un proveedor puede tener varios teléfonos y varios correos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedor_telefonos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id  INT NOT NULL,
  telefono      VARCHAR(15) NOT NULL,
  tipo          ENUM('oficina', 'celular', 'whatsapp', 'otro') NOT NULL DEFAULT 'oficina',
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_proveedor_telefono (proveedor_id, telefono),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proveedor_correos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id  INT NOT NULL,
  correo        VARCHAR(100) NOT NULL,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_proveedor_correo (proveedor_id, correo),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Productos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  codigo_barras   VARCHAR(50) NOT NULL UNIQUE,
  -- Categoría restringida a una lista cerrada (ENUM). Para agregar una categoría nueva hay que
  categoria       ENUM('Papelería', 'Bebidas', 'Comida', 'Tecnología', 'Limpieza', 'Herramientas', 'Hogar', 'Cuidado personal', 'Mascotas', 'Otros') NOT NULL DEFAULT 'Otros',
  presentacion    VARCHAR(50),
  unidad_medida   VARCHAR(50),
  precio          DECIMAL(10,2) NOT NULL,
  -- Existencia total de almacén: se mantiene sola (triggers) como la suma de lotes_producto
  stock_almacen   INT NOT NULL DEFAULT 0,
  stock_mostrador INT NOT NULL DEFAULT 0,
  -- 0 = inactivo, 1 = activo, 2 = archivado
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para el control de Lotes en Almacén
CREATE TABLE IF NOT EXISTS lotes_producto (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL DEFAULT 0,
  fecha_caducidad DATE NULL,
  recibido_en     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Triggers: mantienen productos.stock_almacen = SUM(lotes_producto.cantidad)
-- sin importar qué módulo (inventario, recepción, etc.) toque los lotes.
CREATE TRIGGER trg_lotes_ai AFTER INSERT ON lotes_producto FOR EACH ROW
  UPDATE productos SET stock_almacen = (SELECT COALESCE(SUM(cantidad), 0) FROM lotes_producto WHERE producto_id = productos.id)
  WHERE id = NEW.producto_id;

CREATE TRIGGER trg_lotes_au AFTER UPDATE ON lotes_producto FOR EACH ROW
  UPDATE productos SET stock_almacen = (SELECT COALESCE(SUM(cantidad), 0) FROM lotes_producto WHERE producto_id = productos.id)
  WHERE id IN (NEW.producto_id, OLD.producto_id);

CREATE TRIGGER trg_lotes_ad AFTER DELETE ON lotes_producto FOR EACH ROW
  UPDATE productos SET stock_almacen = (SELECT COALESCE(SUM(cantidad), 0) FROM lotes_producto WHERE producto_id = productos.id)
  WHERE id = OLD.producto_id;

-- Relación muchos-a-muchos: producto <-> proveedores
CREATE TABLE IF NOT EXISTS producto_proveedor (
  producto_id   INT NOT NULL,
  proveedor_id  INT NOT NULL,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id)  REFERENCES productos(id)   ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Pedidos a proveedor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  folio             VARCHAR(30) NOT NULL UNIQUE,
  proveedor_id      INT NOT NULL,
  fecha             DATETIME NOT NULL,
  destino           VARCHAR(50) NOT NULL DEFAULT 'almacen',
  estado            ENUM('pendiente', 'incompleto', 'recibido') NOT NULL DEFAULT 'pendiente',
  fecha_recepcion   DATETIME NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- Detalle / items de cada pedido
CREATE TABLE IF NOT EXISTS pedido_detalle (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id           INT NOT NULL,
    producto_id         INT NOT NULL,
    cantidad_solicitada INT NOT NULL,
    cantidad_recibida   INT NOT NULL DEFAULT 0,
    costo_unitario      DECIMAL(10,2) NOT NULL,
    estado_linea        ENUM('pendiente', 'completo', 'incompleto') NOT NULL DEFAULT 'pendiente',
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ------------------------------------------------------------
-- Ventas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  folio        VARCHAR(30) NULL,
  usuario_id   INT NOT NULL,
  fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
  metodo_pago  ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL DEFAULT 'efectivo',
  subtotal     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuentos   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  iva          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  num_autorizacion  VARCHAR(6)  NULL UNIQUE,
  folio_facturacion VARCHAR(20) NULL UNIQUE,
  -- Estado del módulo de facturación simulada: 'sin_facturar' o 'solicitada' (una venta solo admite una solicitud)
  estado_facturacion ENUM('sin_facturar', 'solicitada') NOT NULL DEFAULT 'sin_facturar',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Detalle / items de cada venta
CREATE TABLE IF NOT EXISTS venta_detalle (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  venta_id          INT NOT NULL,
  producto_id       INT NOT NULL,
  cantidad          INT NOT NULL,
  precio_unitario   DECIMAL(10,2) NOT NULL,
  descuento_tipo    ENUM('porcentaje', 'monto') NOT NULL DEFAULT 'monto',
  descuento_valor   DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal_linea    DECIMAL(10,2) NOT NULL,
  descuento_linea   DECIMAL(10,2) NOT NULL,
  total_linea       DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ------------------------------------------------------------
-- Facturas (facturación SIMULADA con fines académicos: sin timbrado ni UUID del SAT)
-- ------------------------------------------------------------
-- venta_id es UNIQUE: una venta solo puede tener una solicitud de facturación.
CREATE TABLE IF NOT EXISTS facturas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  venta_id            INT NOT NULL UNIQUE,
  folio_factura       VARCHAR(30) NULL UNIQUE,
  rfc                 VARCHAR(13) NOT NULL,
  codigo_postal       CHAR(5) NOT NULL,
  nombre_razon_social VARCHAR(150) NOT NULL,
  regimen_fiscal      VARCHAR(3) NOT NULL,
  uso_cfdi            VARCHAR(4) NOT NULL,
  enviar_correo       TINYINT(1) NOT NULL DEFAULT 0,
  correo              VARCHAR(120) NULL,
  acepta_aviso_privacidad TINYINT(1) NOT NULL DEFAULT 0,
  estado              ENUM('solicitada', 'emitida', 'cancelada') NOT NULL DEFAULT 'solicitada',
  fecha_solicitud     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venta_id) REFERENCES ventas(id)
);

-- ------------------------------------------------------------
-- Movimientos de Inventario (Kardex / Historial)
-- ------------------------------------------------------------
-- Tipos que registra el modulo de stock: 'mover_mostrador', 'regresar_almacen', 'merma', 'daño', 'conteo_mostrador', 'lote_agregado', 'lote_eliminado'
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- Ej: 'transferencia', 'merma', 'daño', 'conteo_mostrador', 'lote_nuevo', 'lote_editado'
  cantidad INT NOT NULL,
  ubicacion ENUM('almacen', 'mostrador') NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  usuario_id INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================================
-- Datos (importados de la base de datos local)
-- Las ventas existentes quedan con `folio` en NULL porque la base local no tenía esa columna.
-- ============================================================

-- Usuarios / Empleados
INSERT INTO usuarios (id, nombre_completo, correo, password, role, activo, creado_en) VALUES
  (1,'Administrador','admin@uv.mx','123456789','administrador',1,'2026-09-22 08:11:59'),
  (2,'Cajero 01','caja01@uv.mx','123456789','cajero',1,'2026-09-22 08:11:59'),
  (3,'Almacenista','almacen@uv.mx','123456789','almacenista',1,'2026-09-22 08:11:59'),
  (4,'Cajero P','p@uv.mx','123456789','cajero',1,'2026-09-22 09:26:00'),
  (5,'Cajero 02','caja02@uv.mx','123456789','cajero',1,'2026-10-01 19:09:05'),
  (6,'Cajero 03','caja03@uv.mx','123456789','cajero',1,'2026-10-01 19:09:05'),
  (7,'Almacenista 02','almacen02@uv.mx','123456789','almacenista',1,'2026-10-01 19:09:05');

-- Proveedores / Distribuidores
INSERT INTO proveedores (id, nombre, direccion, telefono, email, activo) VALUES
  (1,'Distribuidora Central Papelera S.A.',NULL,NULL,NULL,1),
  (2,'Abarrotes y Suministros del Golfo',NULL,NULL,NULL,1),
  (3,'Comercializadora Universitaria UV',NULL,NULL,NULL,0),
  (4,'Deicbi','Carolino Anaya','2282782080','pepilindro@uv.us',1),
  (5,'Papelería del Centro','Centro, Xalapa, Veracruz',NULL,NULL,1),
  (6,'Bebidas y Consumo Xalapa','Zona comercial, Xalapa, Veracruz',NULL,NULL,1),
  (7,'Tecnología y Accesorios MX','Xalapa, Veracruz',NULL,NULL,1);

-- Teléfonos de proveedores
INSERT INTO proveedor_telefonos (id, proveedor_id, telefono, tipo, es_principal) VALUES
  (1,4,'2282782080','oficina',1),
  (2,4,'1234568912','whatsapp',0),
  (3,1,'2282759153','oficina',1),
  (4,1,'2281467925','whatsapp',0),
  (5,2,'2282765213','oficina',1),
  (6,2,'2282641985','celular',0),
  (7,5,'2283680650','oficina',1),
  (8,5,'2283050623','whatsapp',0),
  (9,5,'2283016235','celular',0),
  (10,6,'2284354386','oficina',1),
  (11,6,'2287638453','whatsapp',0),
  (12,7,'2285652386','oficina',1);

-- Correos de proveedores
INSERT INTO proveedor_correos (id, proveedor_id, correo, es_principal) VALUES
  (1,4,'pepilindro@uv.us',1),
  (2,1,'ventas@centralpapelera.com',1),
  (3,1,'pedidos@centralpapelera.com',0),
  (4,2,'contacto@golfo.com',1),
  (5,5,'ventas@papeleriacentro.es',1),
  (6,5,'pedidos@papeleriacentro.es',0),
  (7,6,'contacto@bebidasxalapa.mx',1),
  (8,6,'ventas@bebidasxalapa.mx',0),
  (9,7,'ventas@tecnomx.es',1);

-- Productos
INSERT INTO productos (id, nombre, codigo_barras, categoria, presentacion, unidad_medida, precio, stock_almacen, stock_mostrador, creado_en, activo) VALUES
  (1,'Agua Mineral 600ml','7501234500016','Comida','Botella','Pieza',15.00,50,0,'2026-09-22 08:11:59',1),
  (2,'Cuaderno profesional','7501234500023','Papelería','100 hojas','Pieza',38.50,100,25,'2026-10-01 19:09:05',1),
  (3,'Bolígrafo azul','7501234500030','Papelería','Punto mediano','Pieza',8.00,25,60,'2026-10-01 19:09:05',1),
  (4,'Lápiz HB','7501234500047','Papelería','Unidad','Pieza',5.50,120,80,'2026-10-01 19:09:05',1),
  (5,'Borrador blanco','7501234500054','Papelería','Unidad','Pieza',6.00,68,40,'2026-10-01 19:09:05',1),
  (6,'Poco x7 PRO','1234567891234','Tecnología','Telefono mediano','Pieza',5999.00,29,7,'2026-09-30 07:25:34',1),
  (7,'Marcador permanente negro','7501234500078','Papelería','Unidad','Pieza',19.00,109,18,'2026-10-01 19:09:05',1),
  (8,'Resaltador amarillo','7501234500085','Papelería','Unidad','Pieza',14.00,40,30,'2026-10-01 19:09:05',1),
  (9,'Carpeta tamaño carta','7501234500092','Papelería','Tamaño carta','Pieza',22.00,52,20,'2026-10-01 19:09:05',1),
  (10,'Hojas blancas','7501234500108','Papelería','Paquete 100 hojas','Paquete',35.00,78,15,'2026-10-01 19:09:05',1),
  (11,'Pegamento en barra','7501234500115','Papelería','21 g','Pieza',17.50,35,22,'2026-10-01 19:09:05',1),
  (12,'Tijeras escolares','7501234500122','Papelería','13 cm','Pieza',25.00,45,12,'2026-10-01 19:09:05',1),
  (13,'Agua natural 1 L','7501234500139','Bebidas','Botella','Pieza',18.00,64,35,'2026-10-01 19:09:05',1),
  (14,'Jugo de naranja 500 ml','7501234500146','Bebidas','Botella','Pieza',23.00,46,20,'2026-10-01 19:09:05',1),
  (15,'Galletas integrales','7501234500153','Comida','Paquete','Pieza',16.00,37,28,'2026-10-01 19:09:05',1),
  (16,'Papas clásicas','7501234500160','Comida','Bolsa 45 g','Pieza',18.50,86,24,'2026-10-01 19:09:05',1),
  (17,'Audífonos alámbricos','7501234500177','Tecnología','Cable 1.2 m','Pieza',149.00,10,8,'2026-10-01 19:09:05',1),
  (18,'Cable USB-C','7501234500184','Tecnología','1 metro','Pieza',89.00,12,10,'2026-10-01 19:09:05',1),
  (19,'Memoria USB 32 GB','7501234500191','Tecnología','32 GB','Pieza',129.00,28,6,'2026-10-01 19:09:05',1),
  (20,'Cinta adhesiva','7501234500207','Papelería','Rollo','Pieza',12.00,41,26,'2026-10-01 19:09:05',1);

-- Lotes de producto (existencias de almacén y caducidades)
INSERT INTO lotes_producto (id, producto_id, cantidad, fecha_caducidad, recibido_en) VALUES
  (1,1,149,NULL,'2026-10-01 11:22:34'),
  (2,6,14,NULL,'2026-10-01 11:22:34'),
  (4,6,50,'2035-10-15','2026-10-01 11:37:03');

-- Recalcula el stock de almacén de todos los productos (útil también para migrar una BD existente)
UPDATE productos p SET p.stock_almacen = (SELECT COALESCE(SUM(l.cantidad), 0) FROM lotes_producto l WHERE l.producto_id = p.id);

-- Relación producto <-> proveedores
INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES
  (2,1),
  (3,1),
  (4,1),
  (5,1),
  (1,2),
  (15,2),
  (16,2),
  (6,4),
  (7,5),
  (8,5),
  (9,5),
  (10,5),
  (11,5),
  (12,5),
  (20,5),
  (13,6),
  (14,6),
  (17,7),
  (18,7),
  (19,7);

-- Pedidos a proveedor
INSERT INTO pedidos (id, folio, proveedor_id, fecha, destino, estado, fecha_recepcion) VALUES
  (1,'OC-2026-001',1,'2026-09-23 17:37:36','almacen','recibido','2026-09-30 07:34:41'),
  (2,'OC-2026-002',2,'2026-09-23 17:37:36','almacen','pendiente',NULL),
  (3,'OC-2026-8973',2,'2026-09-30 09:07:49','almacen','recibido','2026-09-30 09:08:00');

-- Detalle de pedidos
INSERT INTO pedido_detalle (id, pedido_id, producto_id, cantidad_solicitada, cantidad_recibida, costo_unitario, estado_linea) VALUES
  (1,1,1,50,50,10.00,'completo'),
  (2,2,1,30,0,10.00,'pendiente'),
  (4,3,6,15,15,10.00,'completo');

-- Ventas
INSERT INTO ventas (id, folio, usuario_id, fecha, metodo_pago, subtotal, descuentos, iva, total) VALUES
  (1,'OC-2026-001',2,'2026-09-30 08:54:53','efectivo',15.00,0.00,2.40,17.40),
  (2,'OC-2026-002',2,'2026-09-30 08:58:12','efectivo',65989.00,0.00,10558.24,76547.24),
  (3,'OC-2026-003',4,'2026-08-15 09:10:00','efectivo',38.50,0.00,6.16,44.66),
  (4,'OC-2026-004',2,'2026-08-15 09:25:00','tarjeta',24.00,0.00,3.84,27.84),
  (5,'OC-2026-005',5,'2026-10-01 10:00:00','efectivo',35.00,0.00,5.60,40.60),
  (6,'OC-2026-006',6,'2026-10-01 10:35:00','transferencia',149.00,0.00,23.84,172.84),
  (7,'OC-2026-007',4,'2026-10-01 11:05:00','tarjeta',39.00,0.00,6.24,45.24),
  (8,'OC-2026-008',2,'2026-08-15 11:40:00','efectivo',18.50,0.00,2.96,21.46),
  (9,'OC-2026-009',5,'2026-10-01 12:15:00','tarjeta',129.00,0.00,20.64,149.64),
  (10,'OC-2026-010',6,'2026-10-01 13:00:00','efectivo',51.50,0.00,8.24,59.74);

-- Detalle de ventas
INSERT INTO venta_detalle (id, venta_id, producto_id, cantidad, precio_unitario, descuento_tipo, descuento_valor, subtotal_linea, descuento_linea, total_linea) VALUES
  (1,1,1,1,15.00,'monto',0.00,15.00,0.00,15.00),
  (2,2,6,4,5999.00,'monto',0.00,23996.00,0.00,23996.00),
  (3,2,6,6,5999.00,'monto',0.00,35994.00,0.00,35994.00),
  (4,2,6,1,5999.00,'monto',0.00,5999.00,0.00,5999.00),
  (5,3,2,1,38.50,'monto',0.00,38.50,0.00,38.50),
  (6,4,3,3,8.00,'monto',0.00,24.00,0.00,24.00),
  (7,5,10,1,35.00,'monto',0.00,35.00,0.00,35.00),
  (8,6,17,1,149.00,'monto',0.00,149.00,0.00,149.00),
  (9,7,4,2,5.50,'monto',0.00,11.00,0.00,11.00),
  (10,7,8,2,14.00,'monto',0.00,28.00,0.00,28.00),
  (11,8,16,1,18.50,'monto',0.00,18.50,0.00,18.50),
  (12,9,19,1,129.00,'monto',0.00,129.00,0.00,129.00),
  (13,10,13,1,18.00,'monto',0.00,18.00,0.00,18.00),
  (14,10,15,1,16.00,'monto',0.00,16.00,0.00,16.00),
  (15,10,11,1,17.50,'monto',0.00,17.50,0.00,17.50);