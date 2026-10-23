import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { extractProfileAndPost } from "@/lib/post-url"

const parse = extractProfileAndPost
describe("extractProfileAndPost: bsky.app URLs", () => {
  it("accepts a full https URL", () => {
    assert.deepEqual(
      parse("https://bsky.app/profile/alice.bsky.social/post/3kabc123"),
      {
        profile: "alice.bsky.social",
        post: "3kabc123",
        url: "https://bsky.app/profile/alice.bsky.social/post/3kabc123",
        fromAtmosphere: false,
      }
    )
  })

  it("accepts a URL without a scheme and trims whitespace", () => {
    assert.equal(
      parse("  bsky.app/profile/alice.bsky.social/post/3kabc123 \n").url,
      "https://bsky.app/profile/alice.bsky.social/post/3kabc123"
    )
  })

  it("accepts http and www, and still counts as bsky.app", () => {
    const parsed = parse(
      "http://www.bsky.app/profile/alice.bsky.social/post/3kabc123"
    )
    assert.equal(
      parsed.url,
      "https://bsky.app/profile/alice.bsky.social/post/3kabc123"
    )
    assert.equal(parsed.fromAtmosphere, false)
  })

  it("accepts a DID as the actor", () => {
    assert.equal(
      parse("https://bsky.app/profile/did:plc:abc123xyz/post/3kabc123").profile,
      "did:plc:abc123xyz"
    )
  })

  it("decodes a percent-encoded DID", () => {
    assert.equal(
      parse("https://bsky.app/profile/did%3Aplc%3Aabc123xyz/post/3kabc123")
        .profile,
      "did:plc:abc123xyz"
    )
  })

  it("drops query string and fragment", () => {
    assert.equal(
      parse("https://bsky.app/profile/alice.bsky.social/post/3kabc123?ref=x#y")
        .url,
      "https://bsky.app/profile/alice.bsky.social/post/3kabc123"
    )
  })

  it("rebuilds other Atmosphere clients as bsky.app and flags them", () => {
    const parsed = parse(
      "https://deer.social/profile/alice.bsky.social/post/3kabc123"
    )
    assert.equal(
      parsed.url,
      "https://bsky.app/profile/alice.bsky.social/post/3kabc123"
    )
    assert.equal(parsed.fromAtmosphere, true)
  })
})

describe("extractProfileAndPost: trailing segments", () => {
  it("accepts one trailing slash", () => {
    assert.equal(
      parse("https://bsky.app/profile/alice.bsky.social/post/3kabc123/").post,
      "3kabc123"
    )
  })

  for (const input of [
    "https://bsky.app/profile/alice.bsky.social/post/3kabc123/quotes",
    "https://bsky.app/profile/alice.bsky.social/post/3kabc123/reposted-by",
    "https://bsky.app/profile/alice.bsky.social/post/3kabc123//",
    "https://bsky.app/profile/alice.bsky.social/post",
    "https://bsky.app/profile/alice.bsky.social",
    "https://bsky.app/x/profile/alice.bsky.social/post/3kabc123",
  ]) {
    it(`rejects ${input}`, () => {
      assert.throws(() => extractProfileAndPost(input), /Invalid URL format/)
    })
  }
})

describe("extractProfileAndPost: at:// URIs", () => {
  it("accepts a handle", () => {
    assert.deepEqual(
      parse("at://alice.bsky.social/app.bsky.feed.post/3kabc123"),
      {
        profile: "alice.bsky.social",
        post: "3kabc123",
        url: "https://bsky.app/profile/alice.bsky.social/post/3kabc123",
        fromAtmosphere: true,
      }
    )
  })

  it("accepts a DID and one trailing slash", () => {
    assert.equal(
      parse("at://did:plc:abc123xyz/app.bsky.feed.post/3kabc123/").url,
      "https://bsky.app/profile/did:plc:abc123xyz/post/3kabc123"
    )
  })

  for (const input of [
    "at://alice.bsky.social/app.bsky.feed.like/3kabc123",
    "at://alice.bsky.social/app.bsky.feed.post",
    "at://alice.bsky.social/app.bsky.feed.post/3kabc123/extra",
  ]) {
    it(`rejects ${input}`, () => {
      assert.throws(() => extractProfileAndPost(input), /Invalid URL/)
    })
  }
})

describe("extractProfileAndPost: invalid actor and rkey", () => {
  for (const input of [
    "https://bsky.app/profile/al%20ice/post/3kabc123",
    "https://bsky.app/profile/alice%2Fbob/post/3kabc123",
    "https://bsky.app/profile/alice/post/3k%25abc",
    "https://bsky.app/profile/alice/post/3k%E0%A4%A",
    "https://bsky.app/profile/alice/post/3k%3Cscript%3E",
    `https://bsky.app/profile/${"a".repeat(254)}/post/3kabc123`,
    `https://bsky.app/profile/alice/post/${"a".repeat(513)}`,
    "at://al ice/app.bsky.feed.post/3kabc123",
  ]) {
    it(`rejects ${input.slice(0, 80)}`, () => {
      assert.throws(() => extractProfileAndPost(input), /Invalid URL format/)
    })
  }

  it("accepts the maximum lengths", () => {
    assert.equal(
      parse(
        `https://bsky.app/profile/${"a".repeat(253)}/post/${"b".repeat(512)}`
      ).post,
      "b".repeat(512)
    )
  })
})

describe("extractProfileAndPost: dot segments", () => {
  for (const input of [
    "https://bsky.app/profile/./post/3kabc123",
    "https://bsky.app/profile/../post/3kabc123",
    "https://bsky.app/profile/alice/post/.",
    "https://bsky.app/profile/alice/post/..",
    "https://bsky.app/profile/alice/post/%2e",
    "https://bsky.app/profile/alice/post/%2E%2E",
    "at://./app.bsky.feed.post/3kabc123",
    "at://../app.bsky.feed.post/3kabc123",
    "at://alice/app.bsky.feed.post/.",
    "at://alice/app.bsky.feed.post/..",
    "at://alice/app.bsky.feed.post/%2e%2e",
  ]) {
    it(`rejects ${input}`, () => {
      assert.throws(() => extractProfileAndPost(input), /Invalid URL format/)
    })
  }
})

describe("extractProfileAndPost: not a URL", () => {
  for (const input of [
    "",
    null,
    undefined,
    "javascript:alert(1)",
    "ftp://bsky.app/profile/a/post/b",
    "http://",
  ]) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      assert.throws(() => extractProfileAndPost(input), /Invalid URL/)
    })
  }
})

it.each([
  "witchsky.app",
  "deer.social",
  "blacksky.community",
  "northsky.app",
  "unknown.example",
])("accepts %s without trusting the host", (host) => {
  assert.equal(
    parse(`${host}/profile/alice.bsky.social/post/abc`).url,
    "https://bsky.app/profile/alice.bsky.social/post/abc"
  )
})
it.each([
  "https://user:pw@bsky.app/profile/alice/post/abc",
  "https://user@deer.social/profile/alice/post/abc",
  "at://user:pw@alice/app.bsky.feed.post/abc",
])("rejects credentials in %s", (value) => {
  assert.throws(() => parse(value), /Invalid URL/)
})
