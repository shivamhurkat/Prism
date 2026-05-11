import { Inngest } from "inngest";

if (process.env.NODE_ENV === 'development') {
  if (!process.env.INNGEST_EVENT_KEY) {
    throw new Error('[inngest] INNGEST_EVENT_KEY is not set. Add it to .env.local.')
  }
}

export const inngest = new Inngest({ id: "prism" });
