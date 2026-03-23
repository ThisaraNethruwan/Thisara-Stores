// ============================================================
//  Thisara Stores — Full Sri Lankan Grocery Seed Script
//  Run: node seed.js
// ============================================================

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const ST = admin.firestore.FieldValue.serverTimestamp;

const categories = [
  { name: "Rice & Grains",        emoji: "🌾", color: "#c49a2a", sort_order: 1  },
  { name: "Flour & Baking",       emoji: "🌿", color: "#d97706", sort_order: 2  },
  { name: "Dhal & Pulses",        emoji: "🫘", color: "#ea580c", sort_order: 3  },
  { name: "Vegetables",           emoji: "🥦", color: "#1e6641", sort_order: 4  },
  { name: "Fruits",               emoji: "🍎", color: "#dc2626", sort_order: 5  },
  { name: "Dairy & Eggs",         emoji: "🥚", color: "#f59e0b", sort_order: 6  },
  { name: "Meat & Fish",          emoji: "🐟", color: "#0891b2", sort_order: 7  },
  { name: "Spices & Condiments",  emoji: "🌶️", color: "#b91c1c", sort_order: 8  },
  { name: "Oils & Ghee",          emoji: "🫙", color: "#78350f", sort_order: 9  },
  { name: "Beverages",            emoji: "🧃", color: "#0369a1", sort_order: 10 },
  { name: "Snacks & Biscuits",    emoji: "🍪", color: "#7c3aed", sort_order: 11 },
  { name: "Canned & Dry Goods",   emoji: "🥫", color: "#475569", sort_order: 12 },
  { name: "Cleaning & Household", emoji: "🧹", color: "#2563eb", sort_order: 13 },
  { name: "Personal Care",        emoji: "🧴", color: "#db2777", sort_order: 14 },
];

const P = (name,cat,emo,price,ppkg,wb,mw,unit,stock,badge,desc) => ({
  name, category:cat, category_emoji:emo,
  price: wb?null:price, price_per_kg: wb?ppkg:null,
  is_weight_based:wb, max_weight:mw,
  unit:unit||"", stock:stock||99, badge:badge||"", active:true, image_url:"",
  description:desc||"",
});

const products = [
  // RICE & GRAINS
  P("Samba Rice (Nippon)","Rice & Grains","🌾",null,185,true,25,"",99,"Hot","Premium Nippon Samba rice. Soft and fluffy, perfect for everyday Sri Lankan meals."),
  P("Nadu Rice (Nippon)","Rice & Grains","🌾",null,160,true,25,"",99,"","Nippon Nadu rice — classic daily rice with a firm texture, ideal for rice and curry."),
  P("Red Raw Rice (Nippon)","Rice & Grains","🌾",null,210,true,20,"",99,"","Nutritious Nippon red raw rice — high in fibre and rich in natural minerals."),
  P("Keeri Samba Rice","Rice & Grains","🌾",null,230,true,20,"",99,"New","Aromatic Keeri Samba rice, perfect for special rice dishes and biriyani."),
  P("Basmati Rice (Sunwhite)","Rice & Grains","🌾",null,480,true,10,"",50,"","Sunwhite premium long-grain Basmati rice — perfect for biriyani and pilaf."),
  P("Boiled Rice (Nippon)","Rice & Grains","🌾",null,155,true,25,"",99,"","Nippon boiled rice — a popular everyday variety for rice and curry."),
  P("Kurakkan Flour","Rice & Grains","🌾",null,320,true,5,"",50,"","Traditional finger millet flour. Great for roti and porridge."),
  P("Popcorn Maize","Rice & Grains","🌾",null,280,true,3,"",40,"","Dried popcorn maize kernels — great for homemade popcorn and snacks."),

  // FLOUR & BAKING
  P("Wheat Flour (Larich 1kg)","Flour & Baking","🌿",290,null,false,null,"1 kg",99,"","Larich extra fine wheat flour. Ideal for bread, hoppers and string hoppers."),
  P("Wheat Flour (Larich 5kg)","Flour & Baking","🌿",1380,null,false,null,"5 kg",40,"Sale","Larich wheat flour family pack — best value for bulk baking."),
  P("Rice Flour","Flour & Baking","🌿",null,220,true,5,"",60,"","Fine rice flour perfect for string hoppers (idiyappam) and kiribath."),
  P("Coconut Flour","Flour & Baking","🌿",null,380,true,3,"",30,"New","Desiccated coconut flour. Great for pol roti, cakes and desserts."),
  P("Semolina (Rava)","Flour & Baking","🌿",null,260,true,5,"",60,"","Coarse semolina for upma, halwa and Sri Lankan semolina pudding."),
  P("Sugar (Finco White)","Flour & Baking","🌿",null,195,true,10,"",99,"","Finco refined white sugar — standard granulated sugar for all uses."),
  P("Brown Sugar","Flour & Baking","🌿",null,280,true,5,"",50,"","Soft brown sugar with a rich molasses flavour. Great for baking."),
  P("Jaggery (Kithul)","Flour & Baking","🌿",null,650,true,3,"",30,"Hot","Pure kithul palm jaggery — natural sweetener for traditional Sri Lankan desserts."),
  P("Baking Powder (Anchor)","Flour & Baking","🌿",95,null,false,null,"100g",40,"","Anchor baking powder for cakes, muffins and breads."),
  P("Instant Yeast","Flour & Baking","🌿",75,null,false,null,"11g sachet",60,"","Instant dry yeast for bread, buns and hoppers."),

  // DHAL & PULSES
  P("Red Lentils (Dhal)","Dhal & Pulses","🫘",null,350,true,5,"",99,"Hot","Red masoor dhal — the most popular pulse in Sri Lanka for dhal curry."),
  P("Green Gram (Mung Bean)","Dhal & Pulses","🫘",null,420,true,5,"",60,"","Whole green mung beans. Great for curries, sprouts and kola kenda."),
  P("Black-eyed Peas","Dhal & Pulses","🫘",null,380,true,5,"",50,"","Dried black-eyed peas — a popular Sri Lankan pulse for thick curries."),
  P("Chickpeas (Kadala)","Dhal & Pulses","🫘",null,450,true,5,"",50,"","Dried chickpeas for kadala curry — a Sri Lankan breakfast favourite."),
  P("Cowpeas (Kauppi)","Dhal & Pulses","🫘",null,360,true,5,"",40,"","Dried cowpeas — used in Sri Lankan curries and rice dishes."),
  P("Soya Meat","Dhal & Pulses","🫘",null,520,true,3,"",60,"New","Dried textured soya protein. High protein meat substitute for curries."),

  // VEGETABLES
  P("Tomatoes","Vegetables","🥦",null,130,true,5,"",50,"","Fresh ripe tomatoes, locally sourced. Perfect for curries and sambols."),
  P("Onions (Big)","Vegetables","🥦",null,180,true,10,"",99,"Hot","Large red onions — an essential ingredient in Sri Lankan cooking."),
  P("Shallots (Small Onion)","Vegetables","🥦",null,350,true,5,"",60,"","Small red shallots — perfect for tempering and sambol."),
  P("Potatoes","Vegetables","🥦",null,200,true,10,"",60,"","Fresh potatoes for curries, devilled dishes and cutlets."),
  P("Garlic","Vegetables","🥦",null,600,true,2,"",50,"","Fresh garlic bulbs — a key flavour base for all Sri Lankan curries."),
  P("Green Chilli","Vegetables","🥦",null,400,true,2,"",40,"","Fresh green chillies — adds heat and flavour to any dish."),
  P("Leeks","Vegetables","🥦",null,280,true,3,"",30,"","Fresh leeks — great for stir-fries and noodle dishes."),
  P("Carrots","Vegetables","🥦",null,190,true,5,"",50,"","Sweet orange carrots — great for curries and salads."),
  P("Cabbage","Vegetables","🥦",null,120,true,5,"",40,"","Fresh cabbage — for mallung, salads and stir-fries."),
  P("Brinjal (Eggplant)","Vegetables","🥦",null,220,true,3,"",40,"","Purple brinjal — essential for Sri Lankan brinjal moju and curries."),
  P("Bitter Gourd (Karawila)","Vegetables","🥦",null,250,true,3,"",30,"","Fresh karawila — traditional Sri Lankan medicinal vegetable."),
  P("Ash Plantain (Alu Kesel)","Vegetables","🥦",null,180,true,5,"",30,"","Raw ash plantain — a classic Sri Lankan vegetable for thick curries."),
  P("Drumstick (Murunga)","Vegetables","🥦",120,null,false,null,"bundle",20,"","Fresh murunga — nutritious and popular in Sri Lankan cooking."),
  P("Green Beans (Bonchi)","Vegetables","🥦",null,260,true,3,"",40,"","Crisp green beans — great for stir-fries and curries."),
  P("Pumpkin","Vegetables","🥦",null,110,true,10,"",30,"","Fresh pumpkin — sweet and tender, great for curries and soups."),
  P("Ginger","Vegetables","🥦",null,700,true,1,"",40,"","Fresh ginger root — used in curries, teas and medicinal preparations."),

  // FRUITS
  P("Bananas (Kolikuttu)","Fruits","🍎",95,null,false,null,"bunch",30,"Hot","Sweet Kolikuttu bananas — the most loved banana variety in Sri Lanka."),
  P("Bananas (Ambul)","Fruits","🍎",80,null,false,null,"bunch",25,"","Ambul bananas — small and sweet with a slightly tangy taste."),
  P("Papaya","Fruits","🍎",160,null,false,null,"piece",20,"","Ripe papaya — rich in vitamin C, great as a snack or fruit salad."),
  P("Pineapple","Fruits","🍎",180,null,false,null,"piece",15,"","Fresh Sri Lankan pineapple — sweet and tangy, great for juice and snacks."),
  P("Watermelon","Fruits","🍎",null,90,true,10,"",15,"","Sweet refreshing watermelon — a perfect tropical summer fruit."),
  P("Mango (Karthakolomban)","Fruits","🍎",null,350,true,5,"",20,"New","Karthakolomban mangoes — the king of Sri Lankan mangoes, rich and juicy."),
  P("Avocado","Fruits","🍎",120,null,false,null,"piece",20,"","Fresh creamy avocado — perfect for smoothies and the classic Sri Lankan avocado juice."),
  P("Rambutan","Fruits","🍎",null,280,true,3,"",15,"New","Fresh rambutan — a sweet and juicy tropical favourite."),

  // DAIRY & EGGS
  P("Farm Eggs (Tray 30)","Dairy & Eggs","🥚",285,null,false,null,"tray (30)",25,"Hot","Fresh free-range farm eggs — 30 per tray. Rich yolk, great taste."),
  P("Farm Eggs (10 pack)","Dairy & Eggs","🥚",100,null,false,null,"10 pcs",30,"","Fresh farm eggs pack of 10. Perfect for small households."),
  P("Fresh Milk (Lakspray 500ml)","Dairy & Eggs","🥚",98,null,false,null,"500ml",40,"","Lakspray full-cream fresh pasteurised milk."),
  P("Fresh Milk (Lakspray 1L)","Dairy & Eggs","🥚",185,null,false,null,"1 litre",30,"","Lakspray 1-litre full-cream fresh milk — family size."),
  P("Buffalo Curd","Dairy & Eggs","🥚",190,null,false,null,"500ml",20,"","Thick traditional Sri Lankan buffalo curd — served with treacle."),
  P("Anchor Butter","Dairy & Eggs","🥚",390,null,false,null,"200g",25,"","Anchor salted butter — great for bread, baking and cooking."),
  P("Milk Powder (Anchor 400g)","Dairy & Eggs","🥚",1650,null,false,null,"400g",20,"","Anchor full-cream milk powder — rich and creamy for tea and cooking."),
  P("Milk Powder (Nespray 400g)","Dairy & Eggs","🥚",1480,null,false,null,"400g",20,"Sale","Nespray fortified milk powder — a trusted household brand in Sri Lanka."),
  P("Condensed Milk (Nestlé)","Dairy & Eggs","🥚",165,null,false,null,"397g tin",30,"","Nestlé sweetened condensed milk — for desserts, tea and watalappan."),
  P("Cheese Slices (Milco)","Dairy & Eggs","🥚",320,null,false,null,"200g",15,"New","Milco processed cheese slices — perfect for sandwiches and toasties."),

  // MEAT & FISH
  P("Dried Fish (Karawala)","Meat & Fish","🐟",null,1400,true,1,"",30,"","Dried salted karawala — a Sri Lankan staple for sambol and curries."),
  P("Maldive Fish (Umbalakada)","Meat & Fish","🐟",null,2800,true,0.5,"",30,"Hot","Dried Maldive fish chips — essential flavouring for Sri Lankan sambols."),
  P("Canned Sardines (Amberjack)","Meat & Fish","🐟",195,null,false,null,"425g tin",40,"Hot","Amberjack canned sardines in tomato sauce — a quick protein meal."),
  P("Canned Tuna (Larich)","Meat & Fish","🐟",220,null,false,null,"185g tin",40,"","Larich canned tuna chunks in brine — great for sandwiches and rice."),
  P("Canned Mackerel (Jackfish)","Meat & Fish","🐟",210,null,false,null,"425g tin",35,"","Jackfish canned mackerel — affordable and tasty protein option."),

  // SPICES & CONDIMENTS
  P("Red Chilli Powder","Spices & Condiments","🌶️",null,1100,true,1,"",99,"Hot","Pure Sri Lankan red chilli powder — hot and aromatic."),
  P("Turmeric Powder","Spices & Condiments","🌶️",null,950,true,1,"",99,"","Pure turmeric powder with rich golden colour and earthy aroma."),
  P("Curry Powder (Larich Roasted)","Spices & Condiments","🌶️",null,1200,true,1,"",99,"","Larich roasted curry powder — the classic Sri Lankan spice blend."),
  P("Unroasted Curry Powder","Spices & Condiments","🌶️",null,1100,true,1,"",60,"","Mild unroasted curry powder — for white curries and koththu."),
  P("Cinnamon Sticks (Ceylon)","Spices & Condiments","🌶️",null,1800,true,0.5,"",40,"","Sri Lankan true cinnamon — world-renowned for its quality."),
  P("Cardamom","Spices & Condiments","🌶️",null,4500,true,0.25,"",30,"","Green cardamom pods — aromatic spice for biriyani, sweets and tea."),
  P("Black Pepper (Whole)","Spices & Condiments","🌶️",null,2200,true,0.5,"",40,"","Whole black pepper — Sri Lanka's finest for grinding and cooking."),
  P("Mustard Seeds","Spices & Condiments","🌶️",null,650,true,1,"",40,"","Yellow mustard seeds — essential for tempering Sri Lankan dishes."),
  P("Fenugreek Seeds (Uluhal)","Spices & Condiments","🌶️",null,580,true,1,"",40,"","Fenugreek seeds — a key spice in Sri Lankan fish curries."),
  P("Coconut Vinegar","Spices & Condiments","🌶️",95,null,false,null,"375ml",40,"","Traditional Sri Lankan coconut vinegar — for pickles and marinades."),
  P("Tamarind (Siyambala)","Spices & Condiments","🌶️",null,380,true,1,"",40,"","Dried tamarind pulp — adds tangy sourness to curries and sambols."),
  P("Goraka (Gamboge)","Spices & Condiments","🌶️",null,750,true,0.5,"",30,"","Dried goraka — a unique Sri Lankan souring agent for fish curries."),
  P("Salt (Keells Iodised)","Spices & Condiments","🌶️",75,null,false,null,"400g",99,"","Keells iodised refined salt — standard table and cooking salt."),

  // OILS & GHEE
  P("Coconut Oil (Parachute 500ml)","Oils & Ghee","🫙",380,null,false,null,"500ml",40,"Hot","Parachute 100% pure coconut oil — for cooking, hair and skin care."),
  P("Coconut Oil (Parachute 1L)","Oils & Ghee","🫙",720,null,false,null,"1 litre",30,"Sale","Parachute 1-litre coconut oil — best value family size."),
  P("Sunflower Oil (Sunrich 1L)","Oils & Ghee","🫙",580,null,false,null,"1 litre",35,"","Sunrich refined sunflower oil — light cooking oil for frying and baking."),
  P("Vegetable Oil (Soo 1L)","Oils & Ghee","🫙",560,null,false,null,"1 litre",35,"","Soo refined vegetable oil — versatile and affordable cooking oil."),
  P("Pure Ghee (Anchor)","Oils & Ghee","🫙",890,null,false,null,"400g",20,"","Anchor clarified butter ghee — rich flavour for biriyani and sweets."),
  P("Margarine (Rathna)","Oils & Ghee","🫙",320,null,false,null,"500g",25,"","Rathna margarine — popular Sri Lankan baking and cooking fat."),

  // BEVERAGES
  P("Ceylon Tea (Dilmah 100 bags)","Beverages","🧃",520,null,false,null,"100 bags",40,"Hot","Dilmah premium Ceylon tea bags — 100% pure Ceylon tea, world famous."),
  P("Lipton Yellow Label Tea","Beverages","🧃",410,null,false,null,"100 bags",35,"","Lipton Yellow Label tea bags — smooth, bright and refreshing."),
  P("Ceylon Tea Leaves (BOP)","Beverages","🧃",null,900,true,2,"",50,"","Bulk BOP Ceylon tea leaves — strong and flavourful."),
  P("Milo (400g tin)","Beverages","🧃",490,null,false,null,"400g",30,"","Nestlé Milo chocolate malt energy drink — loved by all ages in Sri Lanka."),
  P("Milo (1kg bag)","Beverages","🧃",1150,null,false,null,"1 kg bag",20,"Sale","Nestlé Milo 1kg family bag — best value for regular Milo drinkers."),
  P("Ovaltine (400g)","Beverages","🧃",440,null,false,null,"400g",20,"","Ovaltine malted milk drink — nutritious and great for children."),
  P("Nescafé Classic","Beverages","🧃",380,null,false,null,"50g jar",25,"","Nescafé Classic instant coffee — rich aroma and smooth taste."),
  P("Sunrise Coffee & Chicory","Beverages","🧃",320,null,false,null,"50g",25,"","Sunrise Chicory Mix — popular Sri Lankan coffee and chicory blend."),
  P("Coca-Cola","Beverages","🧃",95,null,false,null,"400ml bottle",50,"","Ice-cold Coca-Cola — the classic refreshing soft drink."),
  P("Sprite","Beverages","🧃",95,null,false,null,"400ml bottle",40,"","Sprite lemon-lime fizzy drink — crisp and refreshing."),
  P("EH Cream Soda","Beverages","🧃",85,null,false,null,"400ml bottle",40,"Hot","Elephant House Cream Soda — an iconic Sri Lankan soft drink since 1896."),
  P("EH Ginger Beer","Beverages","🧃",85,null,false,null,"400ml bottle",35,"","Elephant House Ginger Beer — the most beloved Sri Lankan ginger beer."),
  P("Bottled Water (Kellvos 1.5L)","Beverages","🧃",70,null,false,null,"1.5 litre",99,"","Kellvos purified drinking water — safe and refreshing."),
  P("Young Coconut (Thambili)","Beverages","🧃",90,null,false,null,"piece",20,"New","Fresh king coconut (thambili) — the ultimate Sri Lankan natural drink."),

  // SNACKS & BISCUITS
  P("Cream Crackers (Champion)","Snacks & Biscuits","🍪",130,null,false,null,"200g",50,"","Champion cream crackers — crispy and perfect with cheese or butter."),
  P("Marie Biscuits (Maliban)","Snacks & Biscuits","🍪",125,null,false,null,"200g",50,"","Maliban Marie biscuits — a Sri Lankan classic, great with tea."),
  P("Chocolate Puff (Munchee)","Snacks & Biscuits","🍪",80,null,false,null,"65g",40,"Hot","Munchee Chocolate Puff — a beloved Sri Lankan biscuit treat."),
  P("Lemon Puff (Munchee)","Snacks & Biscuits","🍪",80,null,false,null,"65g",40,"","Munchee Lemon Puff — tangy lemon cream filled biscuit sandwich."),
  P("Oreo Cookies","Snacks & Biscuits","🍪",160,null,false,null,"154g",30,"","Oreo classic chocolate sandwich cookies with cream filling."),
  P("Potato Chips (Ritzbury)","Snacks & Biscuits","🍪",75,null,false,null,"45g",50,"","Ritzbury crispy potato chips — crunchy and flavourful snack."),
  P("Kokis Mix","Snacks & Biscuits","🍪",180,null,false,null,"pack",25,"New","Ready mix for traditional Sri Lankan kokis — great for Avurudu season."),
  P("Murukku","Snacks & Biscuits","🍪",null,580,true,1,"",30,"","Crunchy murukku — a traditional Sri Lankan Tamil snack."),
  P("Achcharu Mix","Snacks & Biscuits","🍪",null,460,true,1,"",30,"","Sri Lankan achcharu spice mix — tangy, spicy and addictive!"),

  // CANNED & DRY GOODS
  P("Soy Sauce (Larich)","Canned & Dry Goods","🥫",145,null,false,null,"200ml",30,"","Larich soy sauce — a must for fried rice, noodles and koththu."),
  P("Tomato Ketchup (Heinz)","Canned & Dry Goods","🥫",320,null,false,null,"300g bottle",25,"","Heinz classic tomato ketchup — great for snacks and fried rice."),
  P("Chilli Sauce (MD)","Canned & Dry Goods","🥫",165,null,false,null,"275ml",30,"","MD chilli sauce — spicy Sri Lankan chilli sauce for all occasions."),
  P("Coconut Milk Tin (Maggi)","Canned & Dry Goods","🥫",245,null,false,null,"400ml tin",40,"Hot","Maggi coconut milk — thick and creamy for curries and desserts."),
  P("Coconut Milk Powder (Maggi)","Canned & Dry Goods","🥫",185,null,false,null,"100g",40,"","Maggi coconut milk powder — convenient alternative to fresh coconut milk."),
  P("Indo Mie Noodles (Chicken)","Canned & Dry Goods","🥫",95,null,false,null,"75g packet",60,"","Indo Mie chicken instant noodles — quick and tasty meal."),
  P("Maggi Noodles","Canned & Dry Goods","🥫",75,null,false,null,"75g packet",60,"Hot","Maggi instant noodles — the classic quick meal for all ages."),
  P("Spaghetti (Larich)","Canned & Dry Goods","🥫",195,null,false,null,"400g",25,"","Larich spaghetti pasta — for bolognese and pasta dishes."),
  P("Honey (Lanka Pure)","Canned & Dry Goods","🥫",850,null,false,null,"350g",15,"","Lanka pure natural bee honey — 100% natural, no additives."),
  P("Pineapple Jam (MD)","Canned & Dry Goods","🥫",380,null,false,null,"500g",20,"","MD pineapple jam — made from Sri Lankan pineapples, perfect for bread."),
  P("Kithul Treacle","Canned & Dry Goods","🥫",420,null,false,null,"750ml",20,"New","Pure kithul palm treacle — traditional sweetener for curd and pittu."),

  // CLEANING & HOUSEHOLD
  P("Washing Powder (Surf Excel 1kg)","Cleaning & Household","🧹",420,null,false,null,"1 kg",30,"","Surf Excel washing powder — tough on stains, gentle on clothes."),
  P("Washing Powder (Rinso 1kg)","Cleaning & Household","🧹",365,null,false,null,"1 kg",30,"Sale","Rinso washing powder — effective cleaning at a great price."),
  P("Dish Soap (Sunlight 500ml)","Cleaning & Household","🧹",185,null,false,null,"500ml",40,"","Sunlight dish washing liquid — cuts through grease with ease."),
  P("Vim Scouring Powder","Cleaning & Household","🧹",95,null,false,null,"200g",40,"","Vim scouring powder — powerful cleaning for pots, pans and sinks."),
  P("Floor Cleaner (Harpic Pine)","Cleaning & Household","🧹",195,null,false,null,"500ml",25,"","Harpic pine floor cleaner — disinfects and leaves a fresh pine scent."),
  P("Toilet Cleaner (Harpic)","Cleaning & Household","🧹",225,null,false,null,"500ml",25,"","Harpic toilet bowl cleaner — removes stains and kills 99.9% of germs."),
  P("Mosquito Coils (Baygon)","Cleaning & Household","🧹",145,null,false,null,"10 coils",40,"Hot","Baygon mosquito coils — effective all-night mosquito protection."),
  P("Garbage Bags (Large)","Cleaning & Household","🧹",95,null,false,null,"10 bags",40,"","Heavy-duty large garbage bags — strong and leak-proof."),
  P("White Candles","Cleaning & Household","🧹",120,null,false,null,"pack of 6",30,"","Standard white household candles — essential for power cuts."),
  P("Match Boxes","Cleaning & Household","🧹",50,null,false,null,"10 boxes",50,"","Safety match boxes — 10 boxes per pack."),

  // PERSONAL CARE
  P("Shampoo (Sunsilk Black Shine)","Personal Care","🧴",320,null,false,null,"340ml",25,"","Sunsilk Black Shine shampoo — for deep black, shiny hair."),
  P("Shampoo (Head & Shoulders)","Personal Care","🧴",390,null,false,null,"340ml",20,"","Head & Shoulders anti-dandruff shampoo — clinically proven formula."),
  P("Lifebuoy Soap","Personal Care","🧴",90,null,false,null,"125g",50,"","Lifebuoy antibacterial soap — 100 years of germ protection."),
  P("Lux Rose Beauty Soap","Personal Care","🧴",95,null,false,null,"125g",50,"","Lux Rose moisturising beauty soap — leaves skin smooth and fragrant."),
  P("Toothpaste (Colgate 150g)","Personal Care","🧴",275,null,false,null,"150g",30,"","Colgate total toothpaste — 12-hour protection against cavities."),
  P("Toothpaste (Clogard)","Personal Care","🧴",195,null,false,null,"130g",30,"","Clogard fluoride toothpaste — a popular Sri Lankan dental brand."),
  P("Vaseline Petroleum Jelly","Personal Care","🧴",195,null,false,null,"100ml",25,"","Vaseline 100% pure petroleum jelly — moisturises and protects skin."),
  P("Parachute Coconut Hair Oil","Personal Care","🧴",280,null,false,null,"300ml",25,"","Parachute pure coconut hair oil — nourishes and strengthens hair."),
  P("Sanitary Pads (Kotex)","Personal Care","🧴",295,null,false,null,"8 pads",25,"","Kotex ultra-thin sanitary pads with wings — comfortable all-day protection."),
  P("Gillette 2-Blade Razor","Personal Care","🧴",120,null,false,null,"5 pack",20,"","Gillette 2-blade disposable razors — smooth and close shave."),
];

const orders = [
  {
    customerName:"Kamal Perera", customerPhone:"0771234567",
    deliveryAddress:"45/B, Kandy Road, Kurunegala",
    deliveryLat:7.4863, deliveryLng:80.3647,
    items:[
      {name:"Samba Rice (Nippon)",isWeightBased:true,weightLabel:"3 kg",subtotal:555},
      {name:"Farm Eggs (Tray 30)",isWeightBased:false,qty:1,subtotal:285},
      {name:"Coconut Oil (Parachute 500ml)",isWeightBased:false,qty:1,subtotal:380},
    ],
    deliveryFee:100, totalPrice:1320, status:"delivered", note:"",
  },
  {
    customerName:"Nimali Silva", customerPhone:"0712345678",
    deliveryAddress:"12, Puttalam Road, Kurunegala",
    deliveryLat:7.4910, deliveryLng:80.3582,
    items:[
      {name:"Onions (Big)",isWeightBased:true,weightLabel:"2 kg",subtotal:360},
      {name:"Tomatoes",isWeightBased:true,weightLabel:"1 kg",subtotal:130},
      {name:"Ceylon Tea (Dilmah 100 bags)",isWeightBased:false,qty:1,subtotal:520},
      {name:"Maggi Noodles",isWeightBased:false,qty:3,subtotal:225},
    ],
    deliveryFee:100, totalPrice:1335, status:"confirmed", note:"Please deliver after 5 PM",
  },
  {
    customerName:"Ruwan Fernando", customerPhone:"0751112222",
    deliveryAddress:"78, Colombo Road, Kurunegala",
    deliveryLat:7.4798, deliveryLng:80.3710,
    items:[
      {name:"Nadu Rice (Nippon)",isWeightBased:true,weightLabel:"5 kg",subtotal:800},
      {name:"Red Lentils (Dhal)",isWeightBased:true,weightLabel:"1 kg",subtotal:350},
      {name:"Red Chilli Powder",isWeightBased:true,weightLabel:"0.5 kg",subtotal:550},
    ],
    deliveryFee:150, totalPrice:1850, status:"pending", note:"",
  },
  {
    customerName:"Sanduni Jayawardena", customerPhone:"0763334444",
    deliveryAddress:"23, Nikaweratiya Road, Kurunegala",
    deliveryLat:7.5023, deliveryLng:80.3501,
    items:[
      {name:"Fresh Milk (Lakspray 1L)",isWeightBased:false,qty:2,subtotal:370},
      {name:"Milo (400g tin)",isWeightBased:false,qty:1,subtotal:490},
      {name:"Cream Crackers (Champion)",isWeightBased:false,qty:2,subtotal:260},
    ],
    deliveryFee:100, totalPrice:1220, status:"pending", note:"Ring the bell twice",
  },
  {
    customerName:"Ashan Wickramasinghe", customerPhone:"0779998888",
    deliveryAddress:"5, Negombo Road, Kurunegala",
    deliveryLat:7.4750, deliveryLng:80.3620,
    items:[
      {name:"Bananas (Kolikuttu)",isWeightBased:false,qty:2,subtotal:190},
      {name:"Washing Powder (Surf Excel 1kg)",isWeightBased:false,qty:1,subtotal:420},
      {name:"Lifebuoy Soap",isWeightBased:false,qty:3,subtotal:270},
    ],
    deliveryFee:100, totalPrice:980, status:"delivered", note:"",
  },
  {
    customerName:"Priyanka Rathnayake", customerPhone:"0757771234",
    deliveryAddress:"88, Dambulla Road, Kurunegala",
    deliveryLat:7.5100, deliveryLng:80.3750,
    items:[
      {name:"Wheat Flour (Larich 5kg)",isWeightBased:false,qty:1,subtotal:1380},
      {name:"Sugar (Finco White)",isWeightBased:true,weightLabel:"2 kg",subtotal:390},
      {name:"Coconut Oil (Parachute 1L)",isWeightBased:false,qty:1,subtotal:720},
    ],
    deliveryFee:150, totalPrice:2640, status:"confirmed", note:"",
  },
];

const reviews = [
  {user_name:"Kamal Perera",   rating:5, text:"Best grocery shop in Kurunegala! The Samba rice is always fresh and delivery is always on time. Highly recommend Thisara Stores!", approved:true},
  {user_name:"Nimali Silva",   rating:4, text:"Great range of products — especially the Ceylon tea and spices. Very fresh. Would love to see more fruit varieties added.", approved:true},
  {user_name:"Ruwan Fernando", rating:5, text:"I order my monthly rice and dhal from here every month. Always fresh, good weight and very competitive prices. 10/10!", approved:true},
  {user_name:"Sanduni J.",     rating:4, text:"Very convenient to order from home and get delivered. The milk and Milo arrived well packed. Happy customer!", approved:true},
  {user_name:"Pradeep K.",     rating:3, text:"Good products but delivery took longer than expected last time. Hope they can improve speed. Products were fresh though.", approved:false},
  {user_name:"Chamari Rodrigo",rating:5, text:"Love the coconut oil and spices here — so fresh and authentic! The Kolikuttu bananas are always perfectly ripe. Keep it up!", approved:true},
  {user_name:"Tharanga Silva", rating:5, text:"The Dilmah tea and Milo are always in stock which I love. Prices are fair and delivery fee is reasonable. My go-to shop.", approved:true},
  {user_name:"Malith Perera",  rating:4, text:"Really happy with the dhal and curry powder quality. Tastes just like the market! Will definitely order again.", approved:false},
];

async function seed() {
  console.log("\n════════════════════════════════════════════");
  console.log("   🌿 Thisara Stores — Full Database Seed");
  console.log("════════════════════════════════════════════\n");

  process.stdout.write("📂 Seeding 14 categories... ");
  const catBatch = db.batch();
  categories.forEach(c => catBatch.set(db.collection("categories").doc(), {...c, createdAt:ST()}));
  await catBatch.commit();
  console.log("✅ Done");

  process.stdout.write(`🛒 Seeding ${products.length} products... `);
  for (let i = 0; i < products.length; i += 400) {
    const batch = db.batch();
    products.slice(i, i+400).forEach(p => {
      batch.set(db.collection("products").doc(), {...p, createdAt:ST(), updatedAt:ST()});
    });
    await batch.commit();
  }
  console.log("✅ Done");

  process.stdout.write(`📦 Seeding ${orders.length} orders... `);
  const ordBatch = db.batch();
  orders.forEach(o => ordBatch.set(db.collection("orders").doc(), {...o, createdAt:ST(), updatedAt:ST()}));
  await ordBatch.commit();
  console.log("✅ Done");

  process.stdout.write(`⭐ Seeding ${reviews.length} reviews... `);
  const revBatch = db.batch();
  reviews.forEach(r => revBatch.set(db.collection("reviews").doc(), {...r, createdAt:ST()}));
  await revBatch.commit();
  console.log("✅ Done");

  console.log("\n════════════════════════════════════════════");
  console.log("   ✅  Database seeded successfully!");
  console.log("════════════════════════════════════════════");
  console.log(`   Categories : ${categories.length}`);
  console.log(`   Products   : ${products.length}`);
  console.log(`   Orders     : ${orders.length}`);
  console.log(`   Reviews    : ${reviews.length}`);
  console.log("════════════════════════════════════════════\n");
  process.exit(0);
}

seed().catch(err => { console.error("\n❌ Seed failed:", err.message); process.exit(1); });