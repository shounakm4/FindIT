export const emptyAuthForm = {
  name: "",
  email: "",
  password: ""
};

export const itemCategories = ["phone", "laptop", "headphones", "wallet", "card", "bag", "bottle", "keys", "glasses", "charger"];

// TODO: add the rest of the NUS locations (RCs and Halls). Include free-text input for "Other".
export const nusLocations = [
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "UTown",
  "Central Library",
  "Science",
  "Engineering",
  "Business (BIZ)",
  "Faculty of Arts (FASS)",
  "Yusof Ishak House",
  "The Deck",
  "MPSH",
  "Other"
];

export const emptyItemForm = {
  type: "lost",
  title: "",
  location: "",
  description: "",
  imageDataUrl: "",
  imageFile: null,
  imageSignature: null
};

export const emptyClaimForm = {
  message: "",
  contact: ""
};

export const defaultFeedFilters = {
  query: "",
  type: "all",
  status: "open",
  category: "all",
  location: "all",
  sort: "newest"
};
