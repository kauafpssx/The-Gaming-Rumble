import { sendJson, getJsonBody, createHandler } from "../_utils";
import { encodeGameForDataUrl, makeProtocolUrl } from "../../src/lib/games";

export default createHandler(
  async (req, res) => {
    const body = (await getJsonBody(req)) as Record<string, unknown>;
    const game = body?.game as Record<string, unknown> | undefined;

    if (!game?.title || !game?.magnet) {
      return sendJson(res, 400, {
        error: "Invalid payload",
        hint: "Body must include game.title and game.magnet.",
      });
    }

    const g = game as unknown as Parameters<typeof makeProtocolUrl>[0];
    return sendJson(res, 200, {
      encoded: encodeGameForDataUrl(g),
      deepLinkUrl: `/?data=${encodeGameForDataUrl(g)}`,
      protocolUrl: makeProtocolUrl(g),
    });
  },
  {
    methods: ["POST"],
    rateLimit: 10,
    rateLimitWithKey: 60,
  }
);
