import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config";
import { AuthenticationError } from "./types/error.interface";
import { RedisService, redisService } from "./utils/redis";

export const supabaseClient: SupabaseClient = createClient(
    config.supabaseURL,
    config.supabaseKey
);

export const validateUserWithTokenOrThrow = async (
    token: string
): Promise<User> => {
    // Takes in a JWT to find its associated user
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error) {
        throw error;
    }

    return data.user;
};

export const validateUserAuthentication =
    (app: FastifyInstance) =>
    async (
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<User | undefined> => {
        // Extract the token from the request headers from pattern 'Bearer <token>'
        const token = request.headers.authorization?.split("Bearer ")[1];
        const redis: RedisService = redisService(app);

        if (!token) {
            throw new AuthenticationError(
                "Unauthorized request: Missing authentication token for protected endpoint"
            );
        }

        // Check if token has been revoked
        const revokedToken: string | null = await redis.getFromCache<string>(
            `revoked_token:${token}`
        );

        if (revokedToken) {
            throw new AuthenticationError(
                "Unauthorized request: Token has been revoked"
            );
        }

        // Retrieve associated user object from cache (if it exists)
        const cachedUser: User | null = await redis.getFromCache<User>(
            `auth:${token}`
        );

        if (cachedUser) return cachedUser;

        // If user cannot be found, resort to authentication methods to validate token
        const user: User = await validateUserWithTokenOrThrow(token);

        // Store user data in cache for future requests
        await redis.setInCache<User>(`auth:${token}`, user, 60 * 60);

        return user;
    };
