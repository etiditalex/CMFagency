export const CREATE_POLL_FAQ = [
  {
    question: "What is a Changer Fusions poll?",
    answer:
      "It is a simple way to ask an audience, a brand, a campaign, or a room what they think, then share the live tally. Use it for a runway choice, a public read, or a decision that should stay visible while people vote.",
  },
  {
    question: "How do I create a poll?",
    answer:
      "Enter the question, add at least two answers, and create the poll. It publishes straight away. Share the link, and the totals update on the public results page as votes come in. Set a close date when the poll should end on a given day.",
  },
  {
    question: "Can I customize my poll?",
    answer:
      "You can add a short description, choose the answers, and set when the poll closes. Each browser can vote once. The public page uses the Changer Fusions palette, and the results stay visible while the poll is open and after it closes.",
  },
  {
    question: "Are the results reliable?",
    answer:
      "Each browser can cast one vote, and the totals update as those votes are recorded. Someone can still vote again from another browser, so treat the tally as a live read of the people who had the link.",
  },
  {
    question: "How can I share my poll, and who can vote in it?",
    answer:
      "After you create the poll you get a link. Anyone with that link can vote, and no account is required. Share it in the room, by message, or on a campaign page.",
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes. Creating a poll and voting are free. You do not need an account to publish a poll or to take part.",
  },
] as const;

export const CREATE_POLL_STEPS = [
  {
    title: "Fill out the form",
    body: "Choose a title, add the answer options, and set how the poll should run for your audience, brand, or event.",
  },
  {
    title: "Invite participants",
    body: "Share the poll link so a room, a campaign, or the public can vote as soon as the poll is live.",
  },
  {
    title: "Get instant results",
    body: "As soon as a vote is cast, the totals update on the public results page while the poll is still open.",
  },
] as const;
