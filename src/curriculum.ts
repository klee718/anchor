export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  verseRef: string;       // e.g. "John 11:35"
  translation: "web" | "kjv";
  openingPrompt: string;  // pre-seeded first message sent to Anchor
  xpReward: number;
}

export interface Unit {
  id: number;
  title: string;
  description: string;
  icon: string;           // emoji
  color: string;          // Tailwind bg class for the unit header
  lessons: Lesson[];
}

export const CURRICULUM: Unit[] = [
  {
    id: 1,
    title: "First Questions",
    description: "Why does any of this matter? Start here if you're not sure.",
    icon: "🌱",
    color: "bg-[#3A6B4A]",
    lessons: [
      {
        id: "1-1",
        title: "Does God care about doubt?",
        subtitle: "Thomas wasn't punished for asking",
        verseRef: "John 20:27",
        translation: "web",
        openingPrompt: "I want to start with Thomas — the disciple who said he wouldn't believe unless he could touch the wounds. Was Jesus annoyed at him, or is that story actually encouraging doubt?",
        xpReward: 20,
      },
      {
        id: "1-2",
        title: "What is faith, exactly?",
        subtitle: "It's not what most people think",
        verseRef: "Hebrews 11:1",
        translation: "web",
        openingPrompt: "Hebrews 11:1 is the classic 'faith' definition. Can you look it up and then tell me honestly — does that definition actually make intellectual sense, or is it circular?",
        xpReward: 20,
      },
      {
        id: "1-3",
        title: "Why believe anything?",
        subtitle: "The epistemology underneath religion",
        verseRef: "Proverbs 3:5",
        translation: "web",
        openingPrompt: "Proverbs 3:5 says to trust God and not lean on your own understanding. That sounds like it's asking me to stop thinking critically. Make the strongest possible case for why that's not anti-intellectual — and then tell me the strongest counterargument.",
        xpReward: 20,
      },
    ],
  },
  {
    id: 2,
    title: "Psalms of Lament",
    description: "Anger, grief, and abandonment — scripture's most honest writing.",
    icon: "😤",
    color: "bg-[#5B4FCF]",
    lessons: [
      {
        id: "2-1",
        title: "Screaming at God",
        subtitle: "Psalm 22 — the abandoned cry",
        verseRef: "Psalms 22:1",
        translation: "web",
        openingPrompt: "Psalm 22:1 — 'My God, my God, why have you forsaken me?' — is also what Jesus says on the cross. Look up the verse and explain why a tradition that claims God never abandons people would preserve that line so prominently.",
        xpReward: 25,
      },
      {
        id: "2-2",
        title: "Grief without answers",
        subtitle: "Lamentations and honest pain",
        verseRef: "Lamentations 3:1",
        translation: "web",
        openingPrompt: "Lamentations 3:1 opens with someone describing being driven into darkness by God. Look it up and walk me through what this book is actually saying — not the hopeful parts, start with the dark ones.",
        xpReward: 25,
      },
      {
        id: "2-3",
        title: "Does prayer change anything?",
        subtitle: "Psalm 88 — no happy ending",
        verseRef: "Psalms 88:1",
        translation: "web",
        openingPrompt: "Psalm 88 is the only Psalm that ends with no resolution — just darkness. Look up verse 1 to start, and then tell me why scholars think a Psalm with no redemptive arc made it into the canon.",
        xpReward: 25,
      },
    ],
  },
  {
    id: 3,
    title: "The Sermon on the Mount",
    description: "Jesus's most radical ethical teaching — and what it actually demands.",
    icon: "⛰️",
    color: "bg-[#2C5F8A]",
    lessons: [
      {
        id: "3-1",
        title: "Blessed are the… what?",
        subtitle: "The Beatitudes aren't what they sound like",
        verseRef: "Matthew 5:3",
        translation: "web",
        openingPrompt: "Matthew 5:3 — 'Blessed are the poor in spirit.' Look it up. What does 'poor in spirit' actually mean in the original Greek context, and why do scholars disagree about it?",
        xpReward: 25,
      },
      {
        id: "3-2",
        title: "Love your enemies",
        subtitle: "The hardest command in the text",
        verseRef: "Matthew 5:44",
        translation: "web",
        openingPrompt: "Matthew 5:44 — love your enemies. Look up the exact verse. I want to understand: is this a psychological claim (it's good for you), a political strategy, or something else? What's the strongest secular argument for it?",
        xpReward: 25,
      },
      {
        id: "3-3",
        title: "The Lord's Prayer, slowly",
        subtitle: "What each line actually asks for",
        verseRef: "Matthew 6:9",
        translation: "web",
        openingPrompt: "Matthew 6:9 starts the Lord's Prayer. Look it up. Walk me through the prayer line by line — what is each petition actually saying, and are there any lines that scholars find ambiguous or surprising?",
        xpReward: 25,
      },
    ],
  },
  {
    id: 4,
    title: "Paul vs. Jesus",
    description: "Two voices. Real tensions. The scholars don't all agree.",
    icon: "⚖️",
    color: "bg-[#8A4A2C]",
    lessons: [
      {
        id: "4-1",
        title: "Did Paul invent Christianity?",
        subtitle: "The historical question scholars actually debate",
        verseRef: "Galatians 1:11",
        translation: "web",
        openingPrompt: "Galatians 1:11 — Paul says his gospel came by revelation, not from other humans. Look it up. Walk me through the serious scholarly debate about whether Paul's theology diverges meaningfully from what Jesus himself taught.",
        xpReward: 30,
      },
      {
        id: "4-2",
        title: "Faith vs. works",
        subtitle: "James and Paul seem to contradict each other",
        verseRef: "James 2:24",
        translation: "web",
        openingPrompt: "James 2:24 says a person is justified by works, not by faith alone. Look it up. Paul says the opposite. How do serious theologians reconcile these, and is the contradiction real or apparent?",
        xpReward: 30,
      },
      {
        id: "4-3",
        title: "Women in the church",
        subtitle: "The passages that still divide denominations",
        verseRef: "1 Corinthians 14:34",
        translation: "web",
        openingPrompt: "1 Corinthians 14:34 — look it up. This verse has been used to silence women in churches for centuries. What are the strongest arguments that it's culturally specific and not universal, and what are the honest counter-arguments?",
        xpReward: 30,
      },
    ],
  },
  {
    id: 5,
    title: "Doubt & Faith",
    description: "For the actively doubting. Job, Ecclesiastes, and what's left.",
    icon: "🔦",
    color: "bg-[#7A2C3A]",
    lessons: [
      {
        id: "5-1",
        title: "Everything is meaningless",
        subtitle: "Ecclesiastes is more radical than you think",
        verseRef: "Ecclesiastes 1:2",
        translation: "web",
        openingPrompt: "Ecclesiastes 1:2 — look it up. 'Vanity of vanities, all is vanity.' This is in the Bible. Walk me through why some scholars think Ecclesiastes is barely theistic, and how that affects how you read it.",
        xpReward: 30,
      },
      {
        id: "5-2",
        title: "Why do good people suffer?",
        subtitle: "Job's real argument with God",
        verseRef: "Job 3:3",
        translation: "web",
        openingPrompt: "Job 3:3 — look it up. Job curses the day he was born. By the end of the book, God says Job spoke what was right and his friends didn't. What exactly did Job say that God approved of — and why does that matter for theodicy?",
        xpReward: 30,
      },
      {
        id: "5-3",
        title: "Is faith still possible?",
        subtitle: "An honest final question",
        verseRef: "Mark 9:24",
        translation: "web",
        openingPrompt: "Mark 9:24 — look it up. A father says 'I believe; help my unbelief.' That's the most honest line in the Gospels to me. Is that a sufficient faith? What does the tradition say about people who are half in, half out?",
        xpReward: 30,
      },
    ],
  },
  {
    id: 6,
    title: "Science & Genesis",
    description: "Creation, flood, and languages — literal history or ancient myth?",
    icon: "🌋",
    color: "bg-[#2A757C]",
    lessons: [
      {
        id: "6-1",
        title: "The Order of Creation",
        subtitle: "Genesis 1 vs. modern cosmology",
        verseRef: "Genesis 1:1",
        translation: "web",
        openingPrompt: "Genesis 1:1 is the beginning. Compare the biblical creation sequence to the scientific understanding of cosmic timeline and evolution. What are the strongest theological cases that this was never meant to be read as literal history, and what are the main counter-arguments?",
        xpReward: 35,
      },
      {
        id: "6-2",
        title: "The Great Flood",
        subtitle: "Worldwide deluge or localized disaster?",
        verseRef: "Genesis 6:17",
        translation: "web",
        openingPrompt: "Genesis 6:17 speaks of a flood to destroy all flesh. What does the archaeological and geological consensus say about a global flood? Compare this to other ancient Near Eastern flood myths like Gilgamesh — is the biblical account copy-pasted or unique?",
        xpReward: 35,
      },
      {
        id: "6-3",
        title: "The Tower of Babel",
        subtitle: "The fragmentation of human language",
        verseRef: "Genesis 11:4",
        translation: "web",
        openingPrompt: "Genesis 11:4 tells of humanity building a tower to reach heaven. How do historical linguistics explain the origin of diverse languages? What is the literary and theological purpose of the Babel narrative if it isn't literal linguistics?",
        xpReward: 35,
      },
    ],
  },
  {
    id: 7,
    title: "The Problem of Hell",
    description: "Eternal torment, annihilation, or universal salvation?",
    icon: "🔥",
    color: "bg-[#D05B2B]",
    lessons: [
      {
        id: "7-1",
        title: "Gehenna and Fire",
        subtitle: "What did Jesus mean by hell?",
        verseRef: "Mark 9:43",
        translation: "web",
        openingPrompt: "In Mark 9:43, Jesus refers to Gehenna. Explain what Gehenna actually was historically. How did translations combine Sheol, Hades, and Gehenna into the single English word 'hell' — and does this change what Jesus taught?",
        xpReward: 35,
      },
      {
        id: "7-2",
        title: "Universal Reconciliation",
        subtitle: "Does God save everyone in the end?",
        verseRef: "Colossians 1:20",
        translation: "web",
        openingPrompt: "Colossians 1:20 speaks of reconciling all things to God. What is the history of Universalism in the early church (e.g. Origen, Gregory of Nyssa)? What are the strongest biblical arguments for universal salvation, and what are the strongest biblical counterarguments?",
        xpReward: 35,
      },
      {
        id: "7-3",
        title: "Outer Darkness",
        subtitle: "Weeping and gnashing of teeth",
        verseRef: "Matthew 25:30",
        translation: "web",
        openingPrompt: "Matthew 25:30 talks about the unprofitable servant cast into outer darkness. Are these parables describing a literal torture chamber, or are they warnings about losing status in the kingdom? Detail both views.",
        xpReward: 35,
      },
    ],
  },
  {
    id: 8,
    title: "Empire and Politics",
    description: "Submit to authorities, subvert Caesar, or prepare for the end?",
    icon: "🏛️",
    color: "bg-[#4E3629]",
    lessons: [
      {
        id: "8-1",
        title: "Render unto Caesar",
        subtitle: "Jesus's clever political trap",
        verseRef: "Mark 12:17",
        translation: "web",
        openingPrompt: "Mark 12:17 says 'Render to Caesar the things that are Caesar's, and to God the things that are God's.' Explain how this statement was a dangerous political subversion, rather than simple obedience to taxation. What is the historical context?",
        xpReward: 35,
      },
      {
        id: "8-2",
        title: "Governing Authorities",
        subtitle: "Paul's call to obey the state",
        verseRef: "Romans 13:1",
        translation: "web",
        openingPrompt: "Romans 13:1 tells believers to subject themselves to governing authorities. This passage has been used to justify obedience to terrible dictators. How do theologians reconcile this with civil disobedience (e.g. Bonhoeffer, MLK)?",
        xpReward: 35,
      },
      {
        id: "8-3",
        title: "The Beast and Rome",
        subtitle: "Decoding the code of Revelation",
        verseRef: "Revelation 13:18",
        translation: "web",
        openingPrompt: "Revelation 13:18 gives the number of the beast as 666. Explain why biblical historians believe this is gematria for 'Nero Caesar' rather than a prediction about a modern computer chip or future political figure.",
        xpReward: 35,
      },
    ],
  },
  {
    id: 9,
    title: "The Historical Jesus",
    description: "Who was the man from Nazareth before the creeds?",
    icon: "🐪",
    color: "bg-[#7C662A]",
    lessons: [
      {
        id: "9-1",
        title: "The Messianic Secret",
        subtitle: "Why did Jesus hide his identity?",
        verseRef: "Mark 8:30",
        translation: "web",
        openingPrompt: "In Mark 8:30, Jesus warns his disciples not to tell anyone he is the Christ. Why would a Messiah hide his status? Detail the historical theory of the 'Messianic Secret' popularized by William Wrede.",
        xpReward: 35,
      },
      {
        id: "9-2",
        title: "Apocalyptic Prophet",
        subtitle: "Did Jesus predict the end of the world?",
        verseRef: "Matthew 24:34",
        translation: "web",
        openingPrompt: "Matthew 24:34 says 'This generation will not pass away until all these things take place.' Did Jesus think the end of the age would happen in the lifetime of his audience? Walk through the Albert Schweitzer theory of Jesus as an apocalyptic prophet.",
        xpReward: 35,
      },
      {
        id: "9-3",
        title: "Discrepant Lineages",
        subtitle: "Why genealogies don't match",
        verseRef: "Matthew 1:1",
        translation: "web",
        openingPrompt: "Matthew 1 and Luke 3 offer different lineages for Jesus. Why do they disagree? What are the standard apologetic solutions (e.g., Mary vs Joseph, levirate marriage) and how do modern critical scholars view these genealogies?",
        xpReward: 35,
      },
    ],
  },
  {
    id: 10,
    title: "Tensions of Grace",
    description: "Is grace fair? The challenging subversion of gift vs. merit.",
    icon: "⚖️",
    color: "bg-[#433A52]",
    lessons: [
      {
        id: "10-1",
        title: "The Prodigal Son",
        subtitle: "The scandal of unearned welcome",
        verseRef: "Luke 15:11",
        translation: "web",
        openingPrompt: "In Luke 15:11, the father welcomes the reckless younger son and refuses to reward the loyal older brother. Does this parable show that grace is fundamentally unfair? What is the theological point of the father's response?",
        xpReward: 35,
      },
      {
        id: "10-2",
        title: "Laborers in the Vineyard",
        subtitle: "Equal pay for unequal work",
        verseRef: "Matthew 20:12",
        translation: "web",
        openingPrompt: "Matthew 20:12 shows laborers complaining that those who worked one hour got paid the same as those who bore the burden of the day. Why is this teaching offensive to human ideas of meritocracy? How does it define divine economics?",
        xpReward: 35,
      },
      {
        id: "10-3",
        title: "Faith and Judgment",
        subtitle: "Is belief the only criteria?",
        verseRef: "John 3:18",
        translation: "web",
        openingPrompt: "John 3:18 says whoever does not believe is condemned already. How does this align with passages that emphasize judgment by works (like Matthew 25 or Romans 2)? Address this theological tension directly.",
        xpReward: 35,
      },
    ],
  },
];

export function getLessonById(id: string): Lesson | undefined {
  for (const unit of CURRICULUM) {
    const lesson = unit.lessons.find((l) => l.id === id);
    if (lesson) return lesson;
  }
}

/**
 * Checks if a lesson requires a premium upgrade.
 * Units 1-5 (first 15 lessons) are free.
 * Units 6-10 require premium subscription.
 */
export function isLessonPremium(lessonId: string): boolean {
  const premiumPrefixes = ["6-", "7-", "8-", "9-", "10-"];
  return premiumPrefixes.some((p) => lessonId.startsWith(p));
}

export function isUnitUnlocked(unitId: number, completedLessons: string[]): boolean {
  if (unitId === 1) return true;
  const prevUnit = CURRICULUM.find((u) => u.id === unitId - 1);
  if (!prevUnit) return false;
  return prevUnit.lessons.every((l) => completedLessons.includes(l.id));
}

export function isLessonUnlocked(lesson: Lesson, unitId: number, completedLessons: string[]): boolean {
  const unit = CURRICULUM.find((u) => u.id === unitId);
  if (!unit) return false;
  if (!isUnitUnlocked(unitId, completedLessons)) return false;
  const lessonIndex = unit.lessons.findIndex((l) => l.id === lesson.id);
  if (lessonIndex === 0) return true;
  return completedLessons.includes(unit.lessons[lessonIndex - 1].id);
}

