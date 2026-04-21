# 🚀 Guía de Inicio: EasyDB

EasyDB es una herramienta diseñada para gestionar tus propios datos de forma local, privada y sin complicaciones técnicas. Todo lo que creas se guarda en tu navegador.

## 🛠️ Cómo empezar a usarla

### 1. Preparación del Sistema
Si aún no has instalado las dependencias, abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```

### 2. Iniciar la Aplicación
Para ver la aplicación en acción, ejecuta:
```bash
npm run dev
```
Luego abre el enlace que aparecerá (normalmente `http://localhost:5173`).

---

## 📖 Paso a Paso para un Caso Real

### Escenario: Gestión de Clientes y Pedidos

#### Paso 1: Crear la tabla de Clientes
1. Haz clic en el botón **"+"** en el menú lateral o en **"Crear mi primera tabla"**.
2. Escribe **"Clientes"** y pulsa Enter.
3. Se abrirá la pestaña **"Estructura"**. Aquí definiremos qué información queremos guardar.

#### Paso 2: Definir los campos de Clientes
1. Haz clic en **"Añadir Campo"**.
2. Campo 1: Nombre: `Nombre`, Tipo: `Texto`.
3. Campo 2: Nombre: `Email`, Tipo: `Email`, Marca `Es único`.
4. Campo 3: Nombre: `Ciudad`, Tipo: `Texto`.

#### Paso 3: Agregar datos
1. Ve a la pestaña **"Datos"**.
2. Haz clic en **"Nuevo Registro"**.
3. Rellena la información de tu primer cliente y pulsa **"Crear Registro"**.

#### Paso 4: Crear Relaciones (Pedidos)
1. Crea una nueva tabla llamada **"Pedidos"**.
2. En **"Estructura"**, añade un campo:
   - Nombre: `Cliente`.
   - Tipo: `Relación`.
   - Aparecerá una opción para elegir tabla: selecciona **"Clientes"**.
3. Ahora, cuando crees un nuevo Pedido, verás un desplegable para elegir a qué cliente pertenece.

---

## 💡 Consejos de Uso
- **Búsqueda instantánea**: Usa la barra de búsqueda superior para filtrar registros por cualquier palabra.
- **Exportar**: Haz clic en el icono de descarga (flecha abajo) para bajar un archivo CSV compatible con Excel.
- **Privacidad**: Tus datos nunca salen de tu ordenador. Se guardan en el `localStorage` de tu navegador.

¡Disfruta gestionando tus datos con simplicidad!
