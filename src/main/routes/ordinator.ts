import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";

const API_URL = config.ordinatorApiURL;

export const surveyDistributorServiceController = async (
    app: FastifyInstance
) => {
    app.get(
        "/api/p/survey/distribution/health",
        async (request: FastifyRequest, reply: FastifyReply) => {
            reply.code(200).send({ message: "User Service is healthy" });
        }
    );
};
