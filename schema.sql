-- ============================================================
-- Punto de Venta - Abarrotes
-- Esquema de base de datos (MySQL)
-- Basado en los campos que ya usan los modelos en /src/models
-- ============================================================

CREATE DATABASE IF NOT EXISTS punto_de_venta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE punto_de_venta;

-- ------------------------------------------------------------
-- Usuarios / Empleados  (reemplaza el arreglo de user.model.js)
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo   VARCHAR(150) NOT NULL,
  puesto            VARCHAR(100),
  username          VARCHAR(100) NOT NULL UNIQUE,
  password          VARCHAR(255) NOT NULL, -- guardar con bcrypt, no en texto plano
  role              ENUM('administrador', 'cajero', 'almacenista') NOT NULL,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en         DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Proveedores / Distribuidores (reemplaza el arreglo "proveedores")
-- ------------------------------------------------------------
CREATE TABLE proveedores (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(150) NOT NULL
);

-- ------------------------------------------------------------
-- Productos (reemplaza el arreglo "products")
-- ------------------------------------------------------------
CREATE TABLE productos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  codigo_barras   VARCHAR(50) NOT NULL UNIQUE,
  presentacion    VARCHAR(50),
  unidad_medida   VARCHAR(50),
  precio          DECIMAL(10,2) NOT NULL,
  stock_almacen   INT NOT NULL DEFAULT 0,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Relación muchos-a-muchos: producto <-> proveedores (proveedoresIds)
CREATE TABLE producto_proveedor (
  producto_id   INT NOT NULL,
  proveedor_id  INT NOT NULL,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id)  REFERENCES productos(id)   ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Pedidos a proveedor (reemplaza el arreglo "pedidos" de order.model.js)
-- ------------------------------------------------------------
CREATE TABLE pedidos (
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
CREATE TABLE pedido_detalle (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id              INT NOT NULL,
  producto_id            INT NOT NULL,
  cantidad_solicitada    INT NOT NULL,
  cantidad_recibida      INT NOT NULL DEFAULT 0,
  costo_unitario         DECIMAL(10,2) NOT NULL,
  estado_linea           ENUM('pendiente', 'completo', 'incompleto') NOT NULL DEFAULT 'pendiente',
  FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ------------------------------------------------------------
-- Ventas (para cuando pos.controller.js guarde la venta, no solo calcule)
-- ------------------------------------------------------------
CREATE TABLE ventas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT NOT NULL,
  fecha        DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal     DECIMAL(10,2) NOT NULL,
  descuentos   DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva          DECIMAL(10,2) NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Detalle / items de cada venta (misma forma que "itemsCalculados" en sales.service.js)
CREATE TABLE venta_detalle (
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

-- ============================================================
-- Datos de prueba (los mismos que ya traían los modelos en memoria)
-- ============================================================

INSERT INTO usuarios (nombre_completo, puesto, username, password, role) VALUES
  ('Administrador', 'Administrador', 'admin@uv.mx',   'password123', 'administrador'),
  ('Cajero 01',     'Cajero',        'caja01@uv.mx',  'password123', 'cajero'),
  ('Almacenista',   'Almacenista',   'almacen@uv.mx', 'password123', 'almacenista');

INSERT INTO proveedores (id, nombre) VALUES
  (1, 'Distribuidora Central Papelera S.A.'),
  (2, 'Abarrotes y Suministros del Golfo'),
  (3, 'Comercializadora Universitaria UV');

INSERT INTO productos (nombre, codigo_barras, presentacion, unidad_medida, precio) VALUES
  ('Agua Mineral 600ml (prueba HU-14)', '7501234500016', 'Botella', 'Pieza',  15),
  ('Jugo de Naranja 1L (prueba HU-14)', '7501234500023', 'Caja',    'Litro', 28);

INSERT INTO producto_proveedor (producto_id, proveedor_id) VALUES
  (1, 1),
  (2, 2);
