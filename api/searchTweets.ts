import { VercelRequest, VercelResponse } from "@vercel/node";
import { search } from "./helpers/twitterApi";

export default async function (req: VercelRequest, res: VercelResponse) {
  const { query, paginationToken } = req.query;
  const twitterResult = await search({
    query: typeof query === "string" ? query : query[0],
    paginationToken:
      typeof paginationToken === "string"
        ? paginationToken
        : Array.isArray(paginationToken)
        ? paginationToken[0]
        : undefined,
  });
  res.json(twitterResult);
}
