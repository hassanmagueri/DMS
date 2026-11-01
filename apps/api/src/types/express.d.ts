declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: bigint;
        role: string;
        token: string;
      };
    }
  }
}

export {};
