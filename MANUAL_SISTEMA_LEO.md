# Manual y Documentación del Sistema (Panel Leonardo)

Este documento es una guía amigable para entender cómo está compuesto, dónde está alojado y cómo funciona tu sistema de gestión de pedidos y cuentas corrientes.

---

## 1. ¿Qué es y cómo funciona el sistema?

El sistema es una **Aplicación Web Progresiva (PWA)**, lo que significa que funciona como una página web rápida a la cual puedes entrar desde cualquier navegador (Chrome, Safari) y también puedes "instalar" en tu celular (Agregar a Inicio) para que funcione como una aplicación nativa. No requiere descargar nada desde una App Store.

Su principal objetivo es **digitalizar la toma de pedidos, cotizaciones, y manejar las cuentas corrientes (deudas/saldos a favor) de tus clientes** sin requerir un control de stock físico complejo.

### Funciones Principales
1. **Catálogo y Precios (ABM de Artículos):** Puedes tener tu lista de productos con su costo (lo que tú pagas) y aplicarles diferentes listas de precio porcentuales a la hora de armar el pedido. Esto facilita actualizar márgenes.
2. **Pedidos/Boletas:** Cuando creas un pedido, seleccionas el cliente, le asignas su lista de venta (+20%, +25%, +35%) y vas agregando artículos. El sistema calcula los subtotales automáticamente. 
   - A cada ítem le podés poner su estado (Entregado, Cambio, Devolución) y descuentos.
   - Las devoluciones restan dinero directamente del total.
3. **Cuentas Corrientes:** El sistema maneja de forma automática la cuenta de cada cliente.
   - Si un pedido tiene un total de $10.000 y se "Cierra", ese saldo se suma a la cuenta del cliente.
   - Si el cliente te paga, registras el "Pago" y se resta ese monto del saldo deudor.
   - Tienes el historial de movimientos clarito: cuándo se facturó algo y cuándo te pagó.
4. **Exportación y Logística:** Permite generar PDFs de las boletas (listas para enviar por WhatsApp) y exportar listados de clientes o la lista consolidada de armado (Logística) para saber qué mercadería juntar y llevar en el camión.

---

## 2. Tecnologías (El código detrás del telón)

Para que el sistema sea rápido, moderno y no se trabe, utilizamos las mejores tecnologías del mercado actual:

- **Lenguaje Principal:** Todo el código está unificado bajo **Next.js y React** usando TypeScript. Esto permite que tanto el diseño visual (lo que vos ves) como la lógica del servidor (guardar cosas en la base de datos) convivan de la manera más rápida posible.
- **Estilos:** Diseño personalizado optimizado tanto para Computadora de escritorio como para Celulares (Mobile First). Funciona de 10 si vas caminando por la calle tomando pedidos con el celu.
- **ORM y Base de Datos:** Usamos **Prisma**, que es un motor inteligente que comunica nuestro código con la base de datos en milisegundos y nos protege de errores de grabado.

---

## 3. ¿Dónde se aloja todo? (Hosting y Servidores) ☁️

Nada corre en computadoras físicas de tu casa, está todo "En la Nube" y esparcido en los mejores servidores de nivel mundial.

- **El Código de la Página (Frontend y Backend):** Está alojado en **Vercel**. Es uno de los servidores más veloces y seguros de la actualidad, creado específicamente para sistemas Next.js. Si se edita el código, se sube la actualización y Vercel lo impacta online en minutos sin cortes prolongados.
- **La Base de Datos:** Usamos una Base de Datos en la nube del tipo **PostgreSQL**. Es una base de datos relacional de nivel empresarial, muy robusta. Si se te apaga el celular, o se corta tu luz, la información sigue 100% íntegra allí. Tu información (clientes, precios, deudas) está guardada de forma segura.

---

## 4. Estructura de Datos (Nuestras Tablas)

La base de datos se divide principalmente en estas mesas de trabajo (tablas):

* **Articulos (`articulos`):** Guarda toda tu mercadería (Nombre, Costo, Precio base).
* **Rubros y Proveedores:** Sirven para organizar/filtrar qué productos tienes y a quién se los compras.
* **Clientes (`clientes`):** Guarda la info del local (Nombre, Dirección, WhatsApp) y lo más importante: **El Saldo Actual**.
* **Pedidos (`pedidos`) y Pedidos_Items (`pedido_items`):** 
  - El "Pedido" es la boleta en general (Fecha, Total general, Notas, Link a PDF). 
  - "Pedido Items" son los renglones de la boleta (2 Cajas de cartón, 1 cinta, etc.) con sus cantidades exactas y si hubo devoluciones de por medio.
* **Movimientos de Cuenta Corriente (`movimientos_cc`):** Es el corazón del historial financiero. Aquí se anota cada vez que "Entró" plata (un Pago) o "Salió" plata (Un Ajuste o cuando se cerró y cargó un pedido nuevo). 
* **Packs (`packs`):** Son plantillas armadas de combos frecuentes (Ej: Pack Promocional Kiosco) para tirarlos todos juntos a un pedido en 1 click de forma masiva.

---

## 5. Mantenimiento y Buenas Prácticas

1. **Mantener una sola pestaña de Nuevo Pedido a la vez:** El sistema guarda la carga instantánea, pero siempre es mejor armar el pedido completo, confirmarlo y recién ahí empezar el de otro cliente para no marear los cálculos de lista de precio.
2. **"Cerrar Pedido" vs "Editar":** Si te equivocaste en algo, editá el pedido. **Pero cuidado**, una vez que tocas el botón verde "Cerrar", la plata impacta en el cliente. Si te das cuenta de un error grave después de cerrarlo, vas a tener que registrar un "Ajuste de Saldo Manual" en el Cliente para nivelar la cuenta, ya que el Pedido Cerrado queda congelado a nivel contable.
3. No se requiere "Copia de Seguridad" manual (Backup en pendrive), todo está automatizado y alojado de forma redundante (Postgres Cloud).
