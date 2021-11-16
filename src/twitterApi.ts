import tk from "./tk.json";

interface Tweet {
  id: string;
  text: string;
}

interface TweetFields {
  attachments: { poll_ids?: string[]; media_keys?: string[] };
  author_id: string;
  conversation_id: string;
  created_at: string; // ISO 8601 date
  entities: Entities;
  in_reply_to_user_id?: string; // can this be null?
  lang: string; // BCP47 language tag
  referenced_tweets: Array<{ type: "replied_to" | "quoted"; id: string }>; // maybe also retweets
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface UrlObj {
  start: number;
  end: number;
  url: string;
  expanded_url: string;
  display_url: string;
  status?: string; // HTTP status
  title?: string;
  description?: string;
  unwound_url?: string;
}

interface Tag {
  start: number;
  end: number;
  tag: string;
}

interface Entities {
  cashtags?: Tag[];
  hashtags?: Tag[];
  mentions?: Tag[];
  urls?: UrlObj[];
}

interface User {
  id: string;
  name: string;
  username: string;
}

interface UserFields {
  created_at: string; // ISO 8601 date
  description?: string;
  entities: {
    url?: Entities;
    description?: Entities;
  };
  location?: string; // not necessarily an actual location
  pinned_tweet_id?: string;
  profile_image_url?: string;
  protected: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  url?: string;
  verified: boolean;
}

interface Media {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
}

interface MediaFields {
  duration_ms?: number;
  height: number;
  width: number;
  preview_image_url: string;
  public_metrics: {
    view_count?: number;
  };
  alt_text?: string;
}

type TweetExpansion = keyof TweetExpansionToField;

interface TweetExpansionToField {
  author_id: "author_id";
  "referenced_tweets.id": "referenced_tweets";
  "in_reply_to_user.id": "in_reply_to_user";
  "attachments.media_keys": "attachments";
  "entities.mentions.username": "entities";
  "referenced_tweets.id.author_id": "referenced_tweets";
}

interface TweetExpansionToIncludes {
  author_id: "users";
  "referenced_tweets.id": "tweets";
  "in_reply_to_user.id": "users";
  "attachments.media_keys": "media";
  "entities.mentions.username": "users";
  "referenced_tweets.id.author_id": "users";
}

interface BaseIncludes<
  M extends keyof MediaFields,
  U extends keyof UserFields,
  T extends keyof TweetFields,
> {
  media: Media & Pick<MediaFields, M>;
  users: User & Pick<UserFields, U>;
  tweets: Tweet & Pick<TweetFields, T>;
}

async function getResponse(endpoint: String) {
  const res = await fetch(`https://api.twitter.com/2/${endpoint}`, {
    headers: { Authorization: `Bearer ${tk.bearerToken}` },
  });
  return res.json();
}

class RequestBuilder<
  E extends TweetExpansion = never,
  TF extends keyof TweetFields = never,
  UF extends keyof UserFields = never,
  MF extends keyof MediaFields = never,
> {
  private expansions = Array<TweetExpansion>();
  private tweetFields = Array<keyof TweetFields>();
  private userFields = Array<keyof UserFields>();
  private mediaFields = Array<keyof MediaFields>();

  expansion<K extends Exclude<TweetExpansion, E>>(
    key: K,
  ): RequestBuilder<
    E | K,
    TF | (TweetExpansionToField[K] & keyof TweetFields),
    UF,
    MF
  > {
    this.expansions.push(key);
    return this;
  }

  tweetField<K extends Exclude<keyof TweetFields, TF>>(
    key: K,
  ): RequestBuilder<E, TF | K, UF, MF> {
    this.tweetFields.push(key);
    return this;
  }

  userField<K extends Exclude<keyof UserFields, UF>>(
    key: K,
  ): RequestBuilder<E, TF, UF | K, MF> {
    this.userFields.push(key);
    return this;
  }

  mediaField<K extends Exclude<keyof MediaFields, MF>>(
    key: K,
  ): RequestBuilder<E, TF, UF, MF | K> {
    this.mediaFields.push(key);
    return this;
  }

  toParams() {
    let result = "";
    if (this.tweetFields.length) {
      result += `&tweet.fields=${this.tweetFields.join(",")}`;
    }
    if (this.userFields.length) {
      result += `&user.fields=${this.userFields.join(",")}`;
    }
    if (this.mediaFields.length) {
      result += `&media.fields=${this.mediaFields.join(",")}`;
    }
    if (this.expansions.length) {
      result += `&expansions=${this.expansions.join(",")}`;
    }
    return result;
  }
}

type IncludesObj<
  E extends TweetExpansion,
  M extends keyof MediaFields,
  U extends keyof UserFields,
  T extends keyof TweetFields,
> = Pick<BaseIncludes<M, U, T>, TweetExpansionToIncludes[E]>;

async function searchTweets<
  E extends TweetExpansion,
  M extends keyof MediaFields,
  U extends keyof UserFields,
  T extends keyof TweetFields,
>(
  query: string,
  builder: RequestBuilder<E, T, U, M>,
): Promise<{
  data: Array<Tweet & Pick<TweetFields, T>>;
  includes: IncludesObj<E, M, U, T>;
}> {
  return await getResponse(
    `tweets/search/recent?query=${encodeURIComponent(
      query,
    )}${builder.toParams()}`,
  );
}

async function customSearchTweets(query: string) {
  const searchBuilder = new RequestBuilder()
    .expansion("attachments.media_keys")
    .expansion("author_id")
    .tweetField("public_metrics")
    .userField("profile_image_url")
    .mediaField("preview_image_url");

  return await searchTweets(query, searchBuilder);
}
