import type { InstagramPost, InstagramProfile } from "@/types/instagram";

const img = (id: string, extra = "") =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80${extra}`;

export const DEMO_PROFILE: InstagramProfile = {
  id: "demo_store_001",
  username: "demo",
  fullName: "نوران",
  biography:
    "Contemporary womenswear · Designed in Tehran\nShipping across Iran\nLink in bio →",
  profileUrl: "https://www.instagram.com/demo/",
  profilePicUrl: img("photo-1524504388940-b1c1722653e1"),
  profilePicUrlHD: img("photo-1524504388940-b1c1722653e1"),
  followersCount: 28400,
  followsCount: 312,
  postsCount: 186,
  isBusinessAccount: true,
  isPrivate: false,
  isVerified: false,
  businessCategory: "Clothing (Brand)",
  externalUrl: null,
  scrapedAt: new Date("2026-03-01T09:00:00.000Z"),
};

function post(params: {
  id: string;
  type?: InstagramPost["type"];
  caption: string;
  image: string;
  images?: string[];
  likes: number;
  comments: number;
  day: number;
  alt: string;
  children?: string[];
}): InstagramPost {
  const timestamp = new Date(Date.UTC(2026, 1, params.day, 12)).toISOString();
  const images = params.images ?? [params.image];
  return {
    id: params.id,
    shortcode: params.id,
    url: `https://www.instagram.com/p/${params.id}/`,
    type: params.type ?? (params.children ? "carousel" : "image"),
    caption: params.caption,
    hashtags: Array.from(params.caption.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1]),
    mentions: Array.from(params.caption.matchAll(/@([A-Za-z0-9._]+)/g)).map((m) => m[1]),
    likesCount: params.likes,
    commentsCount: params.comments,
    viewsCount: params.type === "reel" ? params.likes * 12 : null,
    timestamp,
    displayUrl: images[0],
    videoUrl: null,
    images,
    alt: params.alt,
    ownerUsername: "demo",
    ownerId: DEMO_PROFILE.id,
    childPosts: params.children?.map((url, index) => ({
      id: `${params.id}_${index}`,
      shortcode: `${params.id}_${index}`,
      url: `https://www.instagram.com/p/${params.id}/`,
      type: "image" as const,
      caption: null,
      hashtags: [],
      mentions: [],
      likesCount: null,
      commentsCount: null,
      viewsCount: null,
      timestamp,
      displayUrl: url,
      videoUrl: null,
      images: [url],
      alt: params.alt,
      ownerUsername: "demo",
      ownerId: DEMO_PROFILE.id,
    })),
  };
}

export const DEMO_POSTS: InstagramPost[] = [
  post({
    id: "n01",
    caption: "کت لینن بژ، برای روزهایی که شهر آرام‌تر است. #نوران #کت #لینن",
    image: img("photo-1490481651871-ab68de25d43d"),
    likes: 842,
    comments: 36,
    day: 28,
    alt: "زن با کت لینن بژ در نور طبیعی",
  }),
  post({
    id: "n02",
    type: "carousel",
    caption: "مجموعه بهار: سه رنگ، یک برش. سفید، مشکی، خاکی. #مجموعه_بهار",
    image: img("photo-1483985988355-763728e1935b"),
    children: [
      img("photo-1483985988355-763728e1935b"),
      img("photo-1469334031218-e382a71b716b"),
      img("photo-1515886657613-9f3515b0c78f"),
    ],
    likes: 1204,
    comments: 51,
    day: 26,
    alt: "نگاه‌های مختلف از مجموعه بهار نوران",
  }),
  post({
    id: "n03",
    caption: "پیراهن ساتن مشکی. برای شب‌هایی که قرار است به‌یاد بماند.",
    image: img("photo-1515372039744-b8f02a3ae446"),
    likes: 1560,
    comments: 72,
    day: 24,
    alt: "پیراهن ساتن مشکی",
  }),
  post({
    id: "n04",
    caption: "شلوار گشاد کرم و تیشرت سفید. راحتی، بدون شلختگی. #استایل_روزانه",
    image: img("photo-1523381210434-271e8be1f52b"),
    likes: 690,
    comments: 18,
    day: 22,
    alt: "استایل روزانه کرم و سفید",
  }),
  post({
    id: "n05",
    caption: "کیف چرم دستی، دست‌دوز. موجود در رنگ عسلی و مشکی.",
    image: img("photo-1590874103328-eac38a683ce7"),
    likes: 498,
    comments: 41,
    day: 21,
    alt: "کیف چرم دستی عسلی",
  }),
  post({
    id: "n06",
    type: "reel",
    caption: "از پارچه تا تن. پشت‌صحنه دوخت کت بهاره. #پشت_صحنه",
    image: img("photo-1558769132-cb1aea458c5e"),
    likes: 2104,
    comments: 88,
    day: 19,
    alt: "پشت‌صحنه کارگاه نوران",
  }),
  post({
    id: "n07",
    caption: "مانتو کوتاه زغالی. مناسب اداره، بدون فرم اداری.",
    image: img("photo-1509631179647-0177331693ae"),
    likes: 776,
    comments: 29,
    day: 18,
    alt: "مانتو کوتاه زغالی",
  }),
  post({
    id: "n08",
    caption: "جزئیات دوخت روی سرآستین. همین‌هاست که لباس را مال ما می‌کند.",
    image: img("photo-1445205170230-053b83016050"),
    likes: 333,
    comments: 12,
    day: 16,
    alt: "جزئیات دوخت سرآستین",
  }),
  post({
    id: "n09",
    caption: "کفش چرم تخت. برای پیاده‌روی‌های طولانی خیابان ولیعصر.",
    image: img("photo-1543163521-1bf539c55dd2"),
    likes: 512,
    comments: 24,
    day: 15,
    alt: "کفش چرم تخت زنانه",
  }),
  post({
    id: "n10",
    caption: "شال نخی سنگ‌شور. سبک، برای روزهای گرم.",
    image: img("photo-1525507119028-ed4c629a60a3"),
    likes: 401,
    comments: 15,
    day: 13,
    alt: "شال نخی روشن",
  }),
  post({
    id: "n11",
    caption: "نور طبیعی استودیو. رنگ واقعی پارچه را همین‌جا می‌بینید.",
    image: img("photo-1469334031218-e382a71b716b"),
    likes: 628,
    comments: 11,
    day: 12,
    alt: "لباس در نور طبیعی استودیو",
  }),
  post({
    id: "n12",
    caption: "دامن میدی چهارخانه. ترکیب با کت کرم.",
    image: img("photo-1434389677669-e08b4cac3105"),
    likes: 455,
    comments: 19,
    day: 10,
    alt: "دامن میدی چهارخانه",
  }),
  post({
    id: "n13",
    type: "carousel",
    caption: "قبل از سفارش: راهنمای سایز روی تن واقعی.",
    image: img("photo-1485968579580-b6d095142e6e"),
    children: [
      img("photo-1485968579580-b6d095142e6e"),
      img("photo-1529139574466-a303027c1d8b"),
    ],
    likes: 890,
    comments: 63,
    day: 9,
    alt: "راهنمای سایز نوران",
  }),
  post({
    id: "n14",
    caption: "سفارش از دایرکت یا سایت. ارسال ۲ تا ۴ روز کاری.",
    image: img("photo-1441986300917-64674bd600d8"),
    likes: 270,
    comments: 34,
    day: 8,
    alt: "بسته‌بندی سفارش نوران",
  }),
  post({
    id: "n15",
    caption: "بلوز یقه ایستاده سفید. ساده، دقیق.",
    image: img("photo-1539109136881-3be0616acf24"),
    likes: 588,
    comments: 16,
    day: 7,
    alt: "بلوز یقه ایستاده سفید",
  }),
  post({
    id: "n16",
    caption: "رنگ فصل: خاکی گرم. کنار مشکی و سفید.",
    image: img("photo-1479064555552-3ef4979f8908"),
    likes: 431,
    comments: 9,
    day: 6,
    alt: "پارچه خاکی گرم",
  }),
  post({
    id: "n17",
    caption: "جکت دنیم تیره، برش صاف. موجود تا سایز ۴۲.",
    image: img("photo-1544022613-e87ca75a784a"),
    likes: 702,
    comments: 27,
    day: 5,
    alt: "جکت دنیم تیره",
  }),
  post({
    id: "n18",
    caption: "فروشگاه ما روی اینستاگرام بزرگ شد. حالا یک خانه مستقل هم می‌خواهد.",
    image: img("photo-1441984904996-e0b6ba687e04"),
    likes: 980,
    comments: 54,
    day: 4,
    alt: "فضای فروشگاه نوران",
  }),
  post({
    id: "n19",
    caption: "گوشواره Minimal طلایی. ساخت محدود.",
    image: img("photo-1515562141207-7a88fb7ce338"),
    likes: 356,
    comments: 22,
    day: 3,
    alt: "گوشواره طلایی مینیمال",
  }),
  post({
    id: "n20",
    caption: "جمعه: ۱۰٪ روی کت‌های لینن تا پایان هفته. دایرکت بدهید.",
    image: img("photo-1551488831-00ddcb6c6bd3"),
    likes: 1112,
    comments: 91,
    day: 2,
    alt: "کت لینن روی رگال",
  }),
];

export const DEMO_RESTAURANT_IMAGES = [
  img("photo-1414235077428-338989a2e8c0"),
  img("photo-1517248135467-4c7edcad34c4"),
  img("photo-1467003909585-2f8a72700288"),
  img("photo-1540189549336-e6e99c3679fe"),
];

export const DEMO_SERVICES_IMAGES = [
  img("photo-1560066984-138dadb4c035"),
  img("photo-1487412947147-5cebf100ffc2"),
  img("photo-1522335789203-aabd1fc37b80"),
  img("photo-1519415388158-300ca1338e5b"),
];

export const DEMO_CREATOR_IMAGES = [
  img("photo-1492691527719-9d1e07e534b4"),
  img("photo-1452587925148-ce544e77a70d"),
  img("photo-1471341971476-ae15ff5dd4ea"),
  img("photo-1500051638674-ff998a256268"),
];

export const DEMO_BEAUTY_IMAGES = [
  img("photo-1560066984-138dadb4c035"),
  img("photo-1516975080664-ed2fc6a32937"),
  img("photo-1487412720507-e7ab37603c6f"),
  img("photo-1522337660859-02fbefca4702"),
];
