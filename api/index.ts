import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../server.js";

export const config = {
  maxDuration: 60
};

/**
 * Handler Serverless oficial para Vercel (@vercel/node).
 * Permite que Vercel invoque la aplicación Express tanto como función (req, res)
 * como export default directo.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Asegura que las peticiones a la función serverless se deleguen transparentemente a Express
  return (app as any)(req, res);
}

