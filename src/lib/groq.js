import Groq from 'groq-sdk';
import { getSettings } from './db';

const getGroqClient = () => {
  const { groqKey } = getSettings();
  const apiKey = groqKey || import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) return null;

  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
};

export const askAI = async (prompt, context) => {
  const groq = getGroqClient();

  if (!groq) {
    return { 
      action: 'MESSAGE', 
      text: 'La API de Groq no está configurada. Por favor, ve a Configuración y añade tu API Key.' 
    };
  }


  try {

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en gestión de bases de datos no-code. 
          Ayudas al usuario a gestionar sus tablas y datos dentro de una aplicación llamada EasyDB.
          
          Contexto actual de la base de datos:
          ${JSON.stringify(context)}
          
          CONOCIMIENTO DE LA APLICACIÓN (EasyDB):
          - Propósito: Gestor de bases de datos No-Code local.
          - Tablas: Se pueden crear, renombrar y eliminar.
          - Campos: Soporta Texto, Número, Fecha, booleano, Email, Teléfono y Relaciones.
          - Relaciones: Permite vincular una tabla con otra (FK) para integridad referencial.
          - Exportación: Los datos se pueden descargar en CSV o en Imagen (PNG).
          - Esquema: Existe una vista visual (Esquema de la DB) para ver el diagrama de la base de datos.
          - Datos: Los datos se guardan en el localStorage del navegador.
          - IA: Groq ayuda a automatizar tareas con comandos naturales.
          
          IMPORTANTE: Puedes crear múltiples tablas relacionadas en una sola acción usando CREATE_DATABASE.
          
          Debes responder en formato JSON que represente una acción a realizar. 
          Acciones soportadas:
          1. { "action": "CREATE_DATABASE", "tables": [...] }
          2. { "action": "CREATE_TABLE", "name": "...", "fields": [...] }
          3. { "action": "ADD_RECORDS", "tableId": "id", "records": [...] }
          4. { "action": "FILTER", "tableId": "id", "logic": "..." }
          5. { "action": "MESSAGE", "text": "Tu respuesta técnica o tutorial sobre la app/DB" }
          
          Reglas:
          - Si el usuario pregunta "Cómo se usa esto?", usa action "MESSAGE" y explica las funciones.
          - Siempre motiva el uso de buenas prácticas en bases de datos (normalización, llaves, etc.).
          
          Solo devuelve el JSON. Nada más.`


        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    return { action: 'MESSAGE', text: 'Error al conectar con la IA.' };
  }
};

