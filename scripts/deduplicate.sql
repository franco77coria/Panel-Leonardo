-- Eliminar artículos duplicados, manteniendo solo el más reciente de cada nombre
DELETE FROM articulos
WHERE id NOT IN (
    SELECT DISTINCT ON (nombre) id
    FROM articulos
    ORDER BY nombre, "createdAt" DESC
);
