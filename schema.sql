-- ============================================================
-- Punto de Venta - Esquema NORMALIZADO (3FN) para MySQL 8.0.16+
--
-- Cambios principales respecto al esquema anterior:
--  * Catálogos: roles, categorias, unidades_medida, estados_producto,
--    tipos_movimiento, ubicaciones, cat_regimen_fiscal, cat_uso_cfdi.
--  * Se eliminan datos derivados: productos.stock_almacen (y sus
--    triggers), totales de ventas, estado_facturacion/folio_facturacion
--    de ventas, enviar_correo de facturas. Se calculan con VISTAS o
--    columnas generadas.
--  * proveedores ya no repite teléfono/correo; dirección atómica.
--  * facturas: datos fiscales del contribuyente en clientes_fiscales.
-- ============================================================
DROP DATABASE IF EXISTS punto_de_venta;
CREATE DATABASE punto_de_venta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE punto_de_venta;
-- ============================================================
-- CATÁLOGOS
-- ============================================================
CREATE TABLE roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL UNIQUE
);
CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE unidades_medida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE estados_producto (
  id TINYINT UNSIGNED PRIMARY KEY,
  -- 0 inactivo, 1 activo, 2 archivado
  nombre VARCHAR(20) NOT NULL UNIQUE
);
CREATE TABLE tipos_movimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  descripcion VARCHAR(100) NOT NULL
);
-- Ubicación física del producto en la tienda
CREATE TABLE ubicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area VARCHAR(100) NOT NULL,
  pasillo VARCHAR(100) NOT NULL,
  seccion VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_ubicacion (area, pasillo, seccion)
);
-- Catálogos SAT (facturación simulada). Carga parcial; ampliar si hace falta.
CREATE TABLE cat_regimen_fiscal (
  clave CHAR(3) PRIMARY KEY,
  descripcion VARCHAR(150) NOT NULL
);
CREATE TABLE cat_uso_cfdi (
  clave VARCHAR(4) PRIMARY KEY,
  descripcion VARCHAR(150) NOT NULL
);
-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(150) NOT NULL,
  correo VARCHAR(255) NOT NULL UNIQUE,
  -- Se conserva el nombre/valor actual para no romper el login de la app.
  -- Recomendado: guardar un hash (bcrypt) desde la aplicación.
  password VARCHAR(255) NOT NULL,
  rol_id TINYINT UNSIGNED NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);
-- ============================================================
-- PROVEEDORES
-- ============================================================
CREATE TABLE proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  calle VARCHAR(150) NULL,
  colonia VARCHAR(100) NULL,
  ciudad VARCHAR(100) NULL,
  estado VARCHAR(100) NULL,
  codigo_postal CHAR(5) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
-- Un proveedor puede tener varios teléfonos y varios correos
CREATE TABLE proveedor_telefonos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  telefono VARCHAR(15) NOT NULL,
  tipo ENUM('oficina', 'celular', 'whatsapp', 'otro') NOT NULL DEFAULT 'oficina',
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_proveedor_telefono (proveedor_id, telefono),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);
CREATE TABLE proveedor_correos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proveedor_id INT NOT NULL,
  correo VARCHAR(100) NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_proveedor_correo (proveedor_id, correo),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);
-- ============================================================
-- PRODUCTOS E INVENTARIO
-- ============================================================
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  codigo_barras VARCHAR(50) NOT NULL UNIQUE,
  categoria_id INT NOT NULL,
  presentacion VARCHAR(50) NULL,
  -- descripción libre (ej. '100 hojas')
  unidad_medida_id INT NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  stock_mostrador INT NOT NULL DEFAULT 0,
  estado_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  -- 1 = activo
  ubicacion_id INT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_producto_precio CHECK (precio >= 0),
  CONSTRAINT chk_producto_mostrador CHECK (stock_mostrador >= 0),
  FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
  FOREIGN KEY (estado_id) REFERENCES estados_producto(id),
  FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id) ON DELETE
  SET NULL
);
-- Relación muchos-a-muchos: producto <-> proveedores
CREATE TABLE producto_proveedor (
  producto_id INT NOT NULL,
  proveedor_id INT NOT NULL,
  PRIMARY KEY (producto_id, proveedor_id),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
);
-- ============================================================
-- PEDIDOS A PROVEEDOR
-- ============================================================
CREATE TABLE pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(30) NOT NULL UNIQUE,
  proveedor_id INT NOT NULL,
  fecha DATETIME NOT NULL,
  destino ENUM('almacen', 'mostrador') NOT NULL DEFAULT 'almacen',
  estado ENUM(
    'pendiente',
    'en_transito',
    'incompleto',
    'recibido',
    'cancelado'
  ) NOT NULL DEFAULT 'pendiente',
  fecha_recepcion DATETIME NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);
CREATE TABLE pedido_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad_solicitada INT NOT NULL,
  cantidad_recibida INT NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(10, 2) NOT NULL,
  -- Derivado de las cantidades (ya no se almacena)
  estado_linea VARCHAR(10) GENERATED ALWAYS AS (
    CASE
      WHEN cantidad_recibida = 0 THEN 'pendiente'
      WHEN cantidad_recibida >= cantidad_solicitada THEN 'completo'
      ELSE 'incompleto'
    END
  ) VIRTUAL,
  UNIQUE KEY uq_pedido_producto (pedido_id, producto_id),
  CONSTRAINT chk_pd_solicitada CHECK (cantidad_solicitada > 0),
  CONSTRAINT chk_pd_recibida CHECK (cantidad_recibida >= 0),
  CONSTRAINT chk_pd_costo CHECK (costo_unitario >= 0),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);
-- Lotes en almacén. La existencia de almacén = SUM(cantidad) de lotes
-- 'registrado' (ver vista v_stock_almacen); ya no hay triggers.
CREATE TABLE lotes_producto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  pedido_detalle_id INT NULL,
  -- origen del lote, si vino de un pedido
  cantidad INT NOT NULL DEFAULT 0,
  fecha_caducidad DATE NULL,
  recibido_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente', 'registrado') NOT NULL DEFAULT 'registrado',
  CONSTRAINT chk_lote_cantidad CHECK (cantidad >= 0),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (pedido_detalle_id) REFERENCES pedido_detalle(id) ON DELETE
  SET NULL
);
-- Movimientos de inventario (Kardex / historial)
CREATE TABLE movimientos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo_movimiento_id INT NOT NULL,
  cantidad INT NOT NULL,
  ubicacion ENUM('almacen', 'mostrador') NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  usuario_id INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_producto_fecha (producto_id, fecha),
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
-- ============================================================
-- VENTAS
-- ============================================================
-- Subtotal, descuentos, IVA y total NO se guardan: se calculan desde
-- venta_detalle (vista v_ventas).
CREATE TABLE ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(30) NULL UNIQUE,
  usuario_id INT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL DEFAULT 'efectivo',
  num_autorizacion VARCHAR(6) NULL UNIQUE,
  INDEX idx_ventas_fecha (fecha),
  CONSTRAINT chk_autorizacion_efectivo CHECK (
    metodo_pago <> 'efectivo'
    OR num_autorizacion IS NULL
  ),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
CREATE TABLE venta_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  -- precio histórico al momento de la venta
  descuento_tipo ENUM('porcentaje', 'monto') NOT NULL DEFAULT 'monto',
  descuento_valor DECIMAL(10, 2) NOT NULL DEFAULT 0,
  -- Derivados (el orden importa: cada uno usa los anteriores)
  subtotal_linea DECIMAL(10, 2) GENERATED ALWAYS AS (ROUND(cantidad * precio_unitario, 2)) VIRTUAL,
  descuento_linea DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE
      WHEN descuento_tipo = 'porcentaje' THEN ROUND(
        cantidad * precio_unitario * descuento_valor / 100,
        2
      )
      ELSE descuento_valor
    END
  ) VIRTUAL,
  total_linea DECIMAL(10, 2) GENERATED ALWAYS AS (subtotal_linea - descuento_linea) VIRTUAL,
  UNIQUE KEY uq_venta_producto (venta_id, producto_id),
  CONSTRAINT chk_vd_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_vd_precio CHECK (precio_unitario >= 0),
  CONSTRAINT chk_vd_descuento CHECK (
    descuento_valor >= 0
    AND (
      (
        descuento_tipo = 'porcentaje'
        AND descuento_valor <= 100
      )
      OR (
        descuento_tipo = 'monto'
        AND descuento_valor <= cantidad * precio_unitario
      )
    )
  ),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);
-- ============================================================
-- FACTURACIÓN (SIMULADA, fines académicos: sin timbrado ni UUID SAT)
-- ============================================================
-- Datos fiscales del contribuyente (dependen del RFC, no de la factura)
CREATE TABLE clientes_fiscales (
  rfc VARCHAR(13) PRIMARY KEY,
  nombre_razon_social VARCHAR(150) NOT NULL,
  codigo_postal CHAR(5) NOT NULL,
  regimen_fiscal CHAR(3) NOT NULL,
  FOREIGN KEY (regimen_fiscal) REFERENCES cat_regimen_fiscal(clave)
);
-- venta_id UNIQUE: una venta solo admite una solicitud de facturación.
CREATE TABLE facturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL UNIQUE,
  folio_factura VARCHAR(30) NULL UNIQUE,
  rfc VARCHAR(13) NOT NULL,
  uso_cfdi VARCHAR(4) NOT NULL,
  correo VARCHAR(120) NULL,
  -- si es NULL, no se envía por correo
  acepta_aviso_privacidad TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('solicitada', 'emitida', 'cancelada') NOT NULL DEFAULT 'solicitada',
  fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (rfc) REFERENCES clientes_fiscales(rfc),
  FOREIGN KEY (uso_cfdi) REFERENCES cat_uso_cfdi(clave)
);
-- ============================================================
-- VISTAS (datos derivados)
-- ============================================================
CREATE VIEW v_stock_almacen AS
SELECT p.id AS producto_id,
  COALESCE(SUM(l.cantidad), 0) AS stock_almacen
FROM productos p
  LEFT JOIN lotes_producto l ON l.producto_id = p.id
  AND l.estado = 'registrado'
GROUP BY p.id;
CREATE VIEW v_productos AS
SELECT p.id,
  p.nombre,
  p.codigo_barras,
  c.nombre AS categoria,
  p.presentacion,
  u.nombre AS unidad_medida,
  p.precio,
  s.stock_almacen,
  p.stock_mostrador,
  e.nombre AS estado,
  ub.area,
  ub.pasillo,
  ub.seccion,
  p.creado_en
FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  JOIN unidades_medida u ON u.id = p.unidad_medida_id
  JOIN estados_producto e ON e.id = p.estado_id
  JOIN v_stock_almacen s ON s.producto_id = p.id
  LEFT JOIN ubicaciones ub ON ub.id = p.ubicacion_id;
-- Totales de venta. IVA = 16 % de (subtotal - descuentos).
CREATE VIEW v_ventas AS
SELECT x.*,
  ROUND(x.subtotal - x.descuentos + x.iva, 2) AS total
FROM (
    SELECT v.id,
      v.folio,
      v.usuario_id,
      v.fecha,
      v.metodo_pago,
      v.num_autorizacion,
      COALESCE(t.subtotal, 0) AS subtotal,
      COALESCE(t.descuentos, 0) AS descuentos,
      ROUND(
        (
          COALESCE(t.subtotal, 0) - COALESCE(t.descuentos, 0)
        ) * 0.16,
        2
      ) AS iva,
      f.folio_factura AS folio_facturacion,
      IF(f.id IS NULL, 'sin_facturar', 'solicitada') AS estado_facturacion
    FROM ventas v
      LEFT JOIN (
        SELECT venta_id,
          SUM(subtotal_linea) AS subtotal,
          SUM(descuento_linea) AS descuentos
        FROM venta_detalle
        GROUP BY venta_id
      ) t ON t.venta_id = v.id
      LEFT JOIN facturas f ON f.venta_id = v.id
  ) x;
-- ============================================================
-- DATOS: catálogos
-- ============================================================
INSERT INTO roles (id, nombre)
VALUES (1, 'administrador'),
  (2, 'cajero'),
  (3, 'almacenista');
INSERT INTO categorias (id, nombre)
VALUES (1, 'Papelería'),
  (2, 'Bebidas'),
  (3, 'Comida'),
  (4, 'Tecnología'),
  (5, 'Limpieza'),
  (6, 'Herramientas'),
  (7, 'Hogar'),
  (8, 'Cuidado personal'),
  (9, 'Mascotas'),
  (10, 'Otros');
INSERT INTO unidades_medida (id, nombre)
VALUES (1, 'Pieza'),
  (2, 'Paquete');
INSERT INTO estados_producto (id, nombre)
VALUES (0, 'inactivo'),
  (1, 'activo'),
  (2, 'archivado');
INSERT INTO tipos_movimiento (codigo, descripcion)
VALUES (
    'mover_mostrador',
    'Transferencia de almacén a mostrador'
  ),
  (
    'regresar_almacen',
    'Regreso de mostrador a almacén'
  ),
  ('merma', 'Merma'),
  ('daño', 'Producto dañado'),
  (
    'conteo_mostrador',
    'Ajuste por conteo en mostrador'
  ),
  ('lote_agregado', 'Lote agregado'),
  ('lote_editado', 'Lote editado'),
  ('lote_eliminado', 'Lote eliminado');
INSERT INTO cat_regimen_fiscal (clave, descripcion)
VALUES ('601', 'General de Ley Personas Morales'),
  (
    '603',
    'Personas Morales con Fines no Lucrativos'
  ),
  (
    '605',
    'Sueldos y Salarios e Ingresos Asimilados a Salarios'
  ),
  ('606', 'Arrendamiento'),
  (
    '612',
    'Personas Físicas con Actividades Empresariales y Profesionales'
  ),
  ('616', 'Sin obligaciones fiscales'),
  ('621', 'Incorporación Fiscal'),
  ('626', 'Régimen Simplificado de Confianza');
INSERT INTO cat_uso_cfdi (clave, descripcion)
VALUES ('G01', 'Adquisición de mercancías'),
  (
    'G02',
    'Devoluciones, descuentos o bonificaciones'
  ),
  ('G03', 'Gastos en general'),
  ('S01', 'Sin efectos fiscales'),
  ('CP01', 'Pagos');
-- ============================================================
-- DATOS: usuarios y proveedores
-- ============================================================
INSERT INTO usuarios (
    id,
    nombre_completo,
    correo,
    password,
    rol_id,
    activo,
    creado_en
  )
VALUES (
    1,
    'Administrador',
    'admin@uv.mx',
    '123456789',
    1,
    1,
    '2026-09-22 08:11:59'
  ),
  (
    2,
    'Cajero 01',
    'caja01@uv.mx',
    '123456789',
    2,
    1,
    '2026-09-22 08:11:59'
  ),
  (
    3,
    'Almacenista',
    'almacen@uv.mx',
    '123456789',
    3,
    1,
    '2026-09-22 08:11:59'
  ),
  (
    4,
    'Cajero P',
    'p@uv.mx',
    '123456789',
    2,
    1,
    '2026-09-22 09:26:00'
  ),
  (
    5,
    'Cajero 02',
    'caja02@uv.mx',
    '123456789',
    2,
    1,
    '2026-10-01 19:09:05'
  ),
  (
    6,
    'Cajero 03',
    'caja03@uv.mx',
    '123456789',
    2,
    1,
    '2026-10-01 19:09:05'
  ),
  (
    7,
    'Almacenista 02',
    'almacen02@uv.mx',
    '123456789',
    3,
    1,
    '2026-10-01 19:09:05'
  );
INSERT INTO proveedores (
    id,
    nombre,
    calle,
    colonia,
    ciudad,
    estado,
    codigo_postal,
    activo
  )
VALUES (
    1,
    'Distribuidora Central Papelera S.A.',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1
  ),
  (
    2,
    'Abarrotes y Suministros del Golfo',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    1
  ),
  (
    3,
    'Comercializadora Universitaria UV',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    0
  ),
  (
    4,
    'Deicbi',
    'Carolino Anaya',
    NULL,
    NULL,
    NULL,
    NULL,
    1
  ),
  (
    5,
    'Papelería del Centro',
    NULL,
    'Centro',
    'Xalapa',
    'Veracruz',
    NULL,
    1
  ),
  (
    6,
    'Bebidas y Consumo Xalapa',
    NULL,
    'Zona comercial',
    'Xalapa',
    'Veracruz',
    NULL,
    1
  ),
  (
    7,
    'Tecnología y Accesorios MX',
    NULL,
    NULL,
    'Xalapa',
    'Veracruz',
    NULL,
    1
  );
INSERT INTO proveedor_telefonos (id, proveedor_id, telefono, tipo, es_principal)
VALUES (1, 4, '2282782080', 'oficina', 1),
  (2, 4, '1234568912', 'whatsapp', 0),
  (3, 1, '2282759153', 'oficina', 1),
  (4, 1, '2281467925', 'whatsapp', 0),
  (5, 2, '2282765213', 'oficina', 1),
  (6, 2, '2282641985', 'celular', 0),
  (7, 5, '2283680650', 'oficina', 1),
  (8, 5, '2283050623', 'whatsapp', 0),
  (9, 5, '2283016235', 'celular', 0),
  (10, 6, '2284354386', 'oficina', 1),
  (11, 6, '2287638453', 'whatsapp', 0),
  (12, 7, '2285652386', 'oficina', 1);
INSERT INTO proveedor_correos (id, proveedor_id, correo, es_principal)
VALUES (1, 4, 'pepilindro@uv.us', 1),
  (2, 1, 'ventas@centralpapelera.com', 1),
  (3, 1, 'pedidos@centralpapelera.com', 0),
  (4, 2, 'contacto@golfo.com', 1),
  (5, 5, 'ventas@papeleriacentro.es', 1),
  (6, 5, 'pedidos@papeleriacentro.es', 0),
  (7, 6, 'contacto@bebidasxalapa.mx', 1),
  (8, 6, 'ventas@bebidasxalapa.mx', 0),
  (9, 7, 'ventas@tecnomx.es', 1);
-- ============================================================
-- DATOS: productos, lotes y relación con proveedores
-- (el producto 1 pasa de 'Comida' a 'Bebidas')
-- ============================================================
INSERT INTO productos (
    id,
    nombre,
    codigo_barras,
    categoria_id,
    presentacion,
    unidad_medida_id,
    precio,
    stock_mostrador,
    creado_en
  )
VALUES (
    1,
    'Agua Mineral 600ml',
    '7501234500016',
    2,
    'Botella',
    1,
    15.00,
    0,
    '2026-09-22 08:11:59'
  ),
  (
    2,
    'Cuaderno profesional',
    '7501234500023',
    1,
    '100 hojas',
    1,
    38.50,
    25,
    '2026-10-01 19:09:05'
  ),
  (
    3,
    'Bolígrafo azul',
    '7501234500030',
    1,
    'Punto mediano',
    1,
    8.00,
    60,
    '2026-10-01 19:09:05'
  ),
  (
    4,
    'Lápiz HB',
    '7501234500047',
    1,
    'Unidad',
    1,
    5.50,
    80,
    '2026-10-01 19:09:05'
  ),
  (
    5,
    'Borrador blanco',
    '7501234500054',
    1,
    'Unidad',
    1,
    6.00,
    40,
    '2026-10-01 19:09:05'
  ),
  (
    6,
    'Poco x7 PRO',
    '1234567891234',
    4,
    'Telefono mediano',
    1,
    5999.00,
    7,
    '2026-09-30 07:25:34'
  ),
  (
    7,
    'Marcador permanente negro',
    '7501234500078',
    1,
    'Unidad',
    1,
    19.00,
    18,
    '2026-10-01 19:09:05'
  ),
  (
    8,
    'Resaltador amarillo',
    '7501234500085',
    1,
    'Unidad',
    1,
    14.00,
    30,
    '2026-10-01 19:09:05'
  ),
  (
    9,
    'Carpeta tamaño carta',
    '7501234500092',
    1,
    'Tamaño carta',
    1,
    22.00,
    20,
    '2026-10-01 19:09:05'
  ),
  (
    10,
    'Hojas blancas',
    '7501234500108',
    1,
    'Paquete 100 hojas',
    2,
    35.00,
    15,
    '2026-10-01 19:09:05'
  ),
  (
    11,
    'Pegamento en barra',
    '7501234500115',
    1,
    '21 g',
    1,
    17.50,
    22,
    '2026-10-01 19:09:05'
  ),
  (
    12,
    'Tijeras escolares',
    '7501234500122',
    1,
    '13 cm',
    1,
    25.00,
    12,
    '2026-10-01 19:09:05'
  ),
  (
    13,
    'Agua natural 1 L',
    '7501234500139',
    2,
    'Botella',
    1,
    18.00,
    35,
    '2026-10-01 19:09:05'
  ),
  (
    14,
    'Jugo de naranja 500 ml',
    '7501234500146',
    2,
    'Botella',
    1,
    23.00,
    20,
    '2026-10-01 19:09:05'
  ),
  (
    15,
    'Galletas integrales',
    '7501234500153',
    3,
    'Paquete',
    1,
    16.00,
    28,
    '2026-10-01 19:09:05'
  ),
  (
    16,
    'Papas clásicas',
    '7501234500160',
    3,
    'Bolsa 45 g',
    1,
    18.50,
    24,
    '2026-10-01 19:09:05'
  ),
  (
    17,
    'Audífonos alámbricos',
    '7501234500177',
    4,
    'Cable 1.2 m',
    1,
    149.00,
    8,
    '2026-10-01 19:09:05'
  ),
  (
    18,
    'Cable USB-C',
    '7501234500184',
    4,
    '1 metro',
    1,
    89.00,
    10,
    '2026-10-01 19:09:05'
  ),
  (
    19,
    'Memoria USB 32 GB',
    '7501234500191',
    4,
    '32 GB',
    1,
    129.00,
    6,
    '2026-10-01 19:09:05'
  ),
  (
    20,
    'Cinta adhesiva',
    '7501234500207',
    1,
    'Rollo',
    1,
    12.00,
    26,
    '2026-10-01 19:09:05'
  );
-- Lotes originales (ids 1, 2 y 4)
INSERT INTO lotes_producto (
    id,
    producto_id,
    cantidad,
    fecha_caducidad,
    recibido_en
  )
VALUES (1, 1, 149, NULL, '2026-10-01 11:22:34'),
  (2, 6, 14, NULL, '2026-10-01 11:22:34'),
  (4, 6, 50, '2035-10-15', '2026-10-01 11:37:03');
-- Lotes iniciales para el resto de productos, con la existencia de almacén
-- que tenían en el esquema anterior (antes el recálculo final los dejaba en 0).
INSERT INTO lotes_producto (
    producto_id,
    cantidad,
    fecha_caducidad,
    recibido_en
  )
VALUES (2, 100, NULL, '2026-10-01 19:09:05'),
  (3, 25, NULL, '2026-10-01 19:09:05'),
  (4, 120, NULL, '2026-10-01 19:09:05'),
  (5, 68, NULL, '2026-10-01 19:09:05'),
  (7, 109, NULL, '2026-10-01 19:09:05'),
  (8, 40, NULL, '2026-10-01 19:09:05'),
  (9, 52, NULL, '2026-10-01 19:09:05'),
  (10, 78, NULL, '2026-10-01 19:09:05'),
  (11, 35, NULL, '2026-10-01 19:09:05'),
  (12, 45, NULL, '2026-10-01 19:09:05'),
  (13, 64, NULL, '2026-10-01 19:09:05'),
  (14, 46, NULL, '2026-10-01 19:09:05'),
  (15, 37, NULL, '2026-10-01 19:09:05'),
  (16, 86, NULL, '2026-10-01 19:09:05'),
  (17, 10, NULL, '2026-10-01 19:09:05'),
  (18, 12, NULL, '2026-10-01 19:09:05'),
  (19, 28, NULL, '2026-10-01 19:09:05'),
  (20, 41, NULL, '2026-10-01 19:09:05');
INSERT INTO producto_proveedor (producto_id, proveedor_id)
VALUES (2, 1),
  (3, 1),
  (4, 1),
  (5, 1),
  (1, 2),
  (15, 2),
  (16, 2),
  (6, 4),
  (7, 5),
  (8, 5),
  (9, 5),
  (10, 5),
  (11, 5),
  (12, 5),
  (20, 5),
  (13, 6),
  (14, 6),
  (17, 7),
  (18, 7),
  (19, 7);
-- ============================================================
-- DATOS: pedidos
-- ============================================================
INSERT INTO pedidos (
    id,
    folio,
    proveedor_id,
    fecha,
    destino,
    estado,
    fecha_recepcion
  )
VALUES (
    1,
    'OC-2026-001',
    1,
    '2026-09-23 17:37:36',
    'almacen',
    'recibido',
    '2026-09-30 07:34:41'
  ),
  (
    2,
    'OC-2026-002',
    2,
    '2026-09-23 17:37:36',
    'almacen',
    'pendiente',
    NULL
  ),
  (
    3,
    'OC-2026-8973',
    2,
    '2026-09-30 09:07:49',
    'almacen',
    'recibido',
    '2026-09-30 09:08:00'
  );
INSERT INTO pedido_detalle (
    id,
    pedido_id,
    producto_id,
    cantidad_solicitada,
    cantidad_recibida,
    costo_unitario
  )
VALUES (1, 1, 1, 50, 50, 10.00),
  (2, 2, 1, 30, 0, 10.00),
  (4, 3, 6, 15, 15, 10.00);
-- ============================================================
-- DATOS: ventas
-- Cambios: folios V-2026-XXX (antes 'OC-...', formato de pedidos);
-- ventas 3, 4 y 8 movidas de agosto al 30/09 (los usuarios se crearon
-- el 22/09); la venta 2 fusiona sus 3 líneas del producto 6 en una de 11 pzas.
-- ============================================================
INSERT INTO ventas (id, folio, usuario_id, fecha, metodo_pago)
VALUES (
    1,
    'V-2026-001',
    2,
    '2026-09-30 08:54:53',
    'efectivo'
  ),
  (
    2,
    'V-2026-002',
    2,
    '2026-09-30 08:58:12',
    'efectivo'
  ),
  (
    3,
    'V-2026-003',
    4,
    '2026-09-30 09:10:00',
    'efectivo'
  ),
  (
    4,
    'V-2026-004',
    2,
    '2026-09-30 09:25:00',
    'tarjeta'
  ),
  (
    5,
    'V-2026-005',
    5,
    '2026-10-01 10:00:00',
    'efectivo'
  ),
  (
    6,
    'V-2026-006',
    6,
    '2026-10-01 10:35:00',
    'transferencia'
  ),
  (
    7,
    'V-2026-007',
    4,
    '2026-10-01 11:05:00',
    'tarjeta'
  ),
  (
    8,
    'V-2026-008',
    2,
    '2026-09-30 11:40:00',
    'efectivo'
  ),
  (
    9,
    'V-2026-009',
    5,
    '2026-10-01 12:15:00',
    'tarjeta'
  ),
  (
    10,
    'V-2026-010',
    6,
    '2026-10-01 13:00:00',
    'efectivo'
  );
INSERT INTO venta_detalle (
    venta_id,
    producto_id,
    cantidad,
    precio_unitario,
    descuento_tipo,
    descuento_valor
  )
VALUES (1, 1, 1, 15.00, 'monto', 0.00),
  (2, 6, 11, 5999.00, 'monto', 0.00),
  (3, 2, 1, 38.50, 'monto', 0.00),
  (4, 3, 3, 8.00, 'monto', 0.00),
  (5, 10, 1, 35.00, 'monto', 0.00),
  (6, 17, 1, 149.00, 'monto', 0.00),
  (7, 4, 2, 5.50, 'monto', 0.00),
  (7, 8, 2, 14.00, 'monto', 0.00),
  (8, 16, 1, 18.50, 'monto', 0.00),
  (9, 19, 1, 129.00, 'monto', 0.00),
  (10, 13, 1, 18.00, 'monto', 0.00),
  (10, 15, 1, 16.00, 'monto', 0.00),
  (10, 11, 1, 17.50, 'monto', 0.00);

  ALTER TABLE productos ADD COLUMN activo TINYINT(1) DEFAULT 1;