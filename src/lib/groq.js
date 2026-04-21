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
          
          IMPORTANTE: Puedes crear múltiples tablas relacionadas en una sola acción usando CREATE_DATABASE.
          
          Debes responder en formato JSON que represente una acción a realizar. 
          Acciones soportadas:
          1. { 
              "action": "CREATE_DATABASE", 
              "tables": [
                { 
                  "name": "NombreTabla", 
                  "fields": [
                    { "name": "Campo", "type": "text|number|date|boolean|email|phone" },
                    { "name": "CampoFK", "type": "relation", "relationTable": "NombreTablaRelacionada" }
                  ] 
                }
              ] 
             }
          2. { "action": "CREATE_TABLE", "name": "Nombre", "fields": [...] }
          3. { "action": "ADD_RECORDS", "tableId": "id", "records": [...] }
          4. { "action": "FILTER", "tableId": "id", "logic": "..." }
          5. { "action": "MESSAGE", "text": "Respuesta normal" }
          
          Reglas:
          - Para relaciones, usa "relationTable" con el NOMBRE de la tabla (yo me encargo de buscar el ID).
          - Genera estructuras normalizadas si el usuario pide algo complejo como 'un sistema de ventas'.
          
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

