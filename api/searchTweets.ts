import { VercelRequest, VercelResponse } from "@vercel/node";
import { search } from "./helpers/twitterApi";

export default async function (req: VercelRequest, res: VercelResponse) {
  const { query } = req.query;
  const twitterResult = await search({
    query: typeof query === "string" ? query : query[0],
  });
  res.json(twitterResult);
}
