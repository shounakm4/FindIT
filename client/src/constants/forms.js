export const emptyAuthForm = {
  name: "",
  email: "",
  password: ""
};

export const itemCategories = ["Electronics", "Cards & IDs", "Bottles", "Bags", "Keys", "Clothing", "Other"];

export const emptyItemForm = {
  type: "lost",
  title: "",
  location: "",
  category: "Electronics",
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
  sort: "newest"
};
