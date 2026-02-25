-- Agregar columna localidad y mover datos de direccion a localidad
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS localidad TEXT;

-- Mover los datos: lo que está en "direccion" es en realidad la localidad
UPDATE clientes SET localidad = direccion, direccion = NULL WHERE localidad IS NULL AND direccion IS NOT NULL;
