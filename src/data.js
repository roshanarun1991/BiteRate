/* ===== DATA: cuts, places, geography ===== */
/* build.py replaces the next line with data from data/places_auto.json and data/closed.json */
var AUTO_PLACES = [], CLOSED = []; /*AUTO_DATA*/
var CUTS = [
  { id: "og",        label: "The OGs",        col: "#FFD928", ic: "star" },
  { id: "fika",      label: "Fika Break",     col: "#FF9A3C", ic: "bun" },
  { id: "coffee",    label: "Coffee Run",     col: "#B58CFF", ic: "cup" },
  { id: "breakfast", label: "Breakfast Club", col: "#7FD06D", ic: "sun" },
  { id: "brunch",    label: "Brunchcore",     col: "#FFD928", ic: "egg" },
  { id: "vegan",     label: "Vegan Delight",  col: "#5DD9E7", ic: "leaf" },
  { id: "viral",     label: "Viral Food",     col: "#FF9A3C", ic: "bolt" },
  { id: "date",      label: "Date Night",     col: "#FF5F91", ic: "heart" },
  { id: "first",     label: "First Date",     col: "#FF8FB3", ic: "chat" },
  { id: "friends",   label: "Catch-Up Crew",  col: "#48A9F8", ic: "people" },
  { id: "aw",        label: "Afterwork",      col: "#B58CFF", ic: "clock" },
  { id: "beer",      label: "Beer O'Clock",   col: "#7FD06D", ic: "mug" },
  { id: "fancy",     label: "Fancy Pours",    col: "#FF5F91", ic: "cocktail" },
  { id: "wine",      label: "Wine O'Clock",   col: "#C94B6B", ic: "wine" },
  { id: "sweet",     label: "Sweet Treat",    col: "#B58CFF", ic: "cone" }
];
var CUT_BY = {}; CUTS.forEach(function (c) { CUT_BY[c.id] = c; });

var AREAS = ["Gamla Stan", "Södermalm", "Norrmalm", "Östermalm", "Vasastan", "Kungsholmen", "Djurgården"];

/* Place fields: id, name, area, addr (only where a published source confirmed it), lat, lng (approximate pin), cuts[], line, get, skip, isNew.
   ver: 1 = street address confirmed in a 2024-26 guide; 0 = well-known venue, address omitted from the Maps query. */
var PLACES = [
  { id: "vete-katten", name: "Vete-Katten", area: "Norrmalm", addr: "Kungsgatan 55", lat: 59.3351, lng: 18.0626, cuts: ["og", "fika", "sweet"], ver: 1,
    line: "A heritage konditori and the classic first stop for fika in the city centre.", get: "A cinnamon bun or a pastry from the counter", skip: "You want a quiet corner at peak afternoon hours" },
  { id: "cafe-saturnus", name: "Café Saturnus", area: "Östermalm", addr: "Eriksbergsgatan 6", lat: 59.3377, lng: 18.0755, cuts: ["fika", "breakfast", "sweet"], ver: 1,
    line: "Famous for oversized cinnamon buns and a long breakfast menu.", get: "The giant cinnamon bun", skip: "You hate queueing at the weekend" },
  { id: "sturekatten", name: "Sturekatten", area: "Östermalm", addr: "Riddargatan 4", lat: 59.3367, lng: 18.0762, cuts: ["fika", "first"], ver: 1,
    line: "Fika inside an atmospheric 18th-century apartment.", get: "Coffee and a bun in the old rooms", skip: "You want something modern and minimal" },
  { id: "snickarbacken7", name: "Snickarbacken 7", area: "Norrmalm", addr: "Snickarbacken 7", lat: 59.3385, lng: 18.0640, cuts: ["first", "fika", "coffee"], ver: 1,
    line: "A café-gallery that suits an unhurried first-date fika.", get: "Coffee and something sweet, then look around the gallery", skip: "You need a full meal" },
  { id: "rosendals", name: "Rosendals Trädgård", area: "Djurgården", addr: "Rosendalsvägen 38", lat: 59.3268, lng: 18.1150, cuts: ["fika", "brunch", "first"], ver: 1,
    line: "A seasonal garden café with a wood-fired sourdough bakery.", get: "Sourdough or a bun, eaten in the garden", skip: "You need a seat fast on a cold day" },
  { id: "fabrique-gamla", name: "Fabrique Stora Nygatan", area: "Gamla Stan", addr: "Stora Nygatan 28", lat: 59.3238, lng: 18.0705, cuts: ["fika", "coffee"], ver: 0,
    line: "A sourdough bakery with a café counter in the old town.", get: "A wood-fired cinnamon or saffron bun, to go", skip: "You want to sit for a long time" },
  { id: "skeppsbro", name: "Skeppsbro Bageri", area: "Gamla Stan", addr: "Skeppsbron 21", lat: 59.3235, lng: 18.0745, cuts: ["fika"], ver: 1,
    line: "Cold-fermented sourdough sandwiches and pastries by the waterfront.", get: "A sourdough sandwich or a kouign-amann", skip: "You want table service" },
  { id: "drop-coffee", name: "Drop Coffee", area: "Södermalm", addr: "Wollmar Yxkullsgatan 10", lat: 59.3158, lng: 18.0510, cuts: ["coffee"], ver: 1,
    line: "Single-origin filter coffee from a well-known Stockholm roaster.", get: "A filter coffee, black", skip: "You want a long food menu" },
  { id: "johan-nystrom", name: "Johan & Nyström", area: "Södermalm", addr: "Swedenborgsgatan 7", lat: 59.3135, lng: 18.0670, cuts: ["coffee", "first"], ver: 1,
    line: "Specialty coffee at a roastery bar on Söder.", get: "An espresso drink at the bar", skip: "You need lots of seating" },
  { id: "mellqvist", name: "Mellqvist Kaffebar", area: "Vasastan", addr: "Rörstrandsgatan 4", lat: 59.3437, lng: 18.0415, cuts: ["og", "coffee"], ver: 1,
    line: "A long-standing neighbourhood coffee bar.", get: "A flat white and a short walk", skip: "You want a full menu" },
  { id: "cafe-pascal", name: "Café Pascal", area: "Vasastan", addr: "Norrtullsgatan 4", lat: 59.3412, lng: 18.0540, cuts: ["coffee", "fika", "first"], ver: 1,
    line: "Buns, single-origin coffee and laptop-friendly seating.", get: "A cardamom bun with a coffee", skip: "You need a quiet room at lunch" },
  { id: "lillebrors", name: "Lillebrors Bageri", area: "Vasastan", addr: "Rörstrandsgatan 10", lat: 59.3441, lng: 18.0432, cuts: ["fika", "brunch", "breakfast"], ver: 1,
    line: "Sourdough, cardamom buns and weekend brunch with a small pavement terrace.", get: "A cardamom bun, or brunch at the weekend", skip: "You dislike a short wait on Saturdays" },
  { id: "baggio", name: "Baggio", area: "Vasastan", addr: "Surbrunnsgatan 19", lat: 59.3415, lng: 18.0560, cuts: ["breakfast", "coffee"], ver: 1,
    line: "Made-to-order Italian focaccia, bomboloni and good coffee.", get: "Focaccia and a coffee", skip: "You want a sit-down dinner" },
  { id: "stora-bageriet", name: "Stora Bageriet", area: "Östermalm", addr: "Sibyllegatan 2", lat: 59.3345, lng: 18.0780, cuts: ["fika", "sweet"], ver: 1,
    line: "Fresh buns in a former army bakery, with a large outdoor terrace.", get: "A bun on the terrace in summer", skip: "You want a quiet room at peak hours" },
  { id: "komet", name: "Komet", area: "Kungsholmen", addr: "Kungsholmsgatan 10", lat: 59.3320, lng: 18.0420, cuts: ["fika", "breakfast"], ver: 1,
    line: "Laminated croissants and saffron-pistachio buns.", get: "A croissant or the saffron pistachio bun", skip: "You want a long lunch menu" },
  { id: "green-rabbit", name: "Green Rabbit", area: "Vasastan", addr: "Tegnérgatan 17", lat: 59.3385, lng: 18.0580, cuts: ["sweet", "fika"], ver: 1,
    line: "A chocolate morning-bun croissant, semlor and smørrebrød.", get: "The chocolate morning-bun croissant", skip: "You prefer something plain" },
  { id: "mr-cake", name: "Mr Cake", area: "Vasastan", addr: "Rådmansgatan 12", lat: 59.3405, lng: 18.0580, cuts: ["sweet", "fika"], ver: 1,
    line: "Cakes, tarts and cream-piped cinnamon buns.", get: "A cake slice or the halved cream bun", skip: "You are not in a sweet mood" },
  { id: "cafe-string", name: "Café String", area: "Södermalm", addr: "Nytorgsgatan 38", lat: 59.3138, lng: 18.0830, cuts: ["first", "friends", "fika"], ver: 1,
    line: "A second-hand-furniture café with cheap fika near Nytorget.", get: "Coffee and a bun on a mismatched sofa", skip: "You want a polished room" },
  { id: "urban-deli", name: "Nytorget Urban Deli", area: "Södermalm", addr: "Nytorgsgatan 4", lat: 59.3146, lng: 18.0816, cuts: ["brunch", "friends", "aw"], ver: 0,
    line: "Deli, bar and restaurant on Nytorget square.", get: "Brunch, or a drink on the square", skip: "You want a long, quiet dinner" },
  { id: "meatballs", name: "Meatballs for the People", area: "Södermalm", addr: "Nytorgsgatan 30", lat: 59.3140, lng: 18.0822, cuts: ["friends"], ver: 0,
    line: "A whole menu built around meatballs, from classic to inventive.", get: "Classic meatballs with mash and lingonberry", skip: "You want a quiet or vegetarian-first meal" },
  { id: "pelikan", name: "Pelikan", area: "Södermalm", addr: "Blekingegatan 40", lat: 59.3118, lng: 18.0800, cuts: ["og", "friends", "beer"], ver: 0,
    line: "A beer hall with classic Swedish dishes and a retro interior.", get: "Meatballs or herring with a beer", skip: "You want something modern or quiet" },
  { id: "kvarnen", name: "Kvarnen", area: "Södermalm", addr: "Tjärhovsgatan 4", lat: 59.3153, lng: 18.0745, cuts: ["og", "beer", "friends", "aw"], ver: 0,
    line: "An old beer hall that is a long-time local hangout.", get: "A house beer and a classic dish", skip: "You want a calm, small room" },
  { id: "akkurat", name: "Akkurat", area: "Södermalm", addr: "Hornsgatan 18", lat: 59.3185, lng: 18.0680, cuts: ["beer", "aw", "friends"], ver: 0,
    line: "A beer bar known for a very long beer list.", get: "Ask the staff to pick you something", skip: "You want cocktails" },
  { id: "stampen", name: "Stampen", area: "Gamla Stan", addr: "Stora Nygatan 5", lat: 59.3243, lng: 18.0698, cuts: ["friends", "aw"], ver: 0,
    line: "A lively live-music pub in the old town.", get: "A drink while the band plays", skip: "You want to hold a quiet conversation" },
  { id: "sodra-teatern", name: "Södra Teatern", area: "Södermalm", addr: "Mosebacke Torg 1-3", lat: 59.3192, lng: 18.0772, cuts: ["aw", "friends", "fancy"], ver: 0,
    line: "A venue with a terrace above the water, plus bars and club nights.", get: "A drink on the terrace in summer", skip: "You want an early, quiet evening" },
  { id: "fotografiska", name: "Fotografiska", area: "Södermalm", addr: "Stadsgårdshamnen 22", lat: 59.3178, lng: 18.0865, cuts: ["friends", "date"], ver: 0,
    line: "Photography museum with a restaurant and bar over the water.", get: "An exhibition, then a drink with the view", skip: "You are on a tight budget" },
  { id: "pharmarium", name: "Pharmarium", area: "Gamla Stan", addr: "Stortorget 7", lat: 59.3250, lng: 18.0710, cuts: ["fancy", "date"], ver: 0,
    line: "An apothecary-styled cocktail bar on the old town's main square.", get: "A cocktail from the menu", skip: "You are on a tight budget" },
  { id: "ruby", name: "Ruby", area: "Gamla Stan", addr: "Lilla Nygatan 11", lat: 59.3240, lng: 18.0697, cuts: ["fancy", "first", "aw"], ver: 0,
    line: "A cocktail bar tucked into the old town.", get: "A drink early in the evening", skip: "You want a late dance floor" },
  { id: "riche", name: "Riche", area: "Östermalm", addr: "Birger Jarlsgatan 4", lat: 59.3355, lng: 18.0755, cuts: ["og", "date", "wine", "fancy"], ver: 1,
    line: "A classic Swedish restaurant since 1893 with a 900-plus wine list.", get: "A drink at the bar, then dinner", skip: "You want a casual, cheap night" },
  { id: "sturehof", name: "Sturehof", area: "Östermalm", addr: "Stureplan 2", lat: 59.3354, lng: 18.0735, cuts: ["og", "date", "aw"], ver: 1,
    line: "A classic seafood brasserie open every day since 1897.", get: "Seafood at the bar or a table", skip: "You want a quiet evening on Stureplan on a Friday" },
  { id: "ekstedt", name: "Ekstedt", area: "Östermalm", addr: "Humlegårdsgatan 17", lat: 59.3375, lng: 18.0760, cuts: ["date"], ver: 1,
    line: "Warm, fire-cooked food with friendly, professional service.", get: "The wood-fire tasting menu", skip: "You are on a budget" },
  { id: "hillenberg", name: "Hillenberg", area: "Östermalm", addr: "Humlegårdsgatan 14", lat: 59.3378, lng: 18.0765, cuts: ["date", "wine"], ver: 1,
    line: "Large but cosy, mixing Scandinavian and Southern European flavours.", get: "Share a few plates and a bottle", skip: "You want a tiny, hushed room" },
  { id: "spanjorskan", name: "Spanjorskan", area: "Östermalm", addr: "Nybrogatan 42", lat: 59.3370, lng: 18.0840, cuts: ["date", "wine", "friends"], ver: 1,
    line: "Warm, Spain-focused food and wine.", get: "Small plates with a Spanish wine", skip: "You want classic Swedish" },
  { id: "astoria", name: "Brasserie Astoria", area: "Östermalm", addr: "Nybrogatan 15", lat: 59.3340, lng: 18.0770, cuts: ["date", "wine"], ver: 1,
    line: "A grand brasserie with a wine bar in one of its rooms.", get: "A glass at the wine bar before dinner", skip: "You want something low-key" },
  { id: "teatergrillen", name: "Teatergrillen", area: "Östermalm", addr: "Nybrogatan 3", lat: 59.3330, lng: 18.0775, cuts: ["date", "wine"], ver: 1,
    line: "A beautiful classic dining room known for its Burgundy selection.", get: "A long dinner with a Burgundy", skip: "You want a quick bite" },
  { id: "tyge-sessil", name: "Tyge & Sessil", area: "Östermalm", addr: "Brahegatan 4", lat: 59.3375, lng: 18.0845, cuts: ["first", "wine", "date"], ver: 1,
    line: "A casual natural-wine café with small plates.", get: "Two or three small plates and a natural wine", skip: "You want a big hearty main" },
  { id: "the-sparrow", name: "The Sparrow", area: "Östermalm", addr: "Birger Jarlsgatan 26", lat: 59.3375, lng: 18.0738, cuts: ["wine", "first", "date"], ver: 1,
    line: "A French wine bar and restaurant attached to a hotel.", get: "A glass of French wine and a snack", skip: "You want a loud, casual pub" },
  { id: "adam-albin", name: "Adam/Albin", area: "Vasastan", addr: "Rådmansgatan 16", lat: 59.3410, lng: 18.0585, cuts: ["date", "wine"], ver: 1,
    line: "A foodie favourite with a strong Burgundy list.", get: "Whatever the staff recommend with a Burgundy", skip: "You want a very casual night" },
  { id: "elverket", name: "Brasserie Elverket", area: "Östermalm", addr: "Linnégatan 69", lat: 59.3370, lng: 18.0890, cuts: ["friends", "aw"], ver: 1,
    line: "A lively brasserie beside Dramaten, with monthly oyster nights.", get: "Oysters on an oyster night", skip: "You want quiet" },
  { id: "saluhall", name: "Östermalms Saluhall", area: "Östermalm", addr: "Östermalmstorg", lat: 59.3358, lng: 18.0790, cuts: ["og", "friends"], ver: 0,
    line: "A historic food hall with seafood and lunch counters.", get: "An open sandwich or fish at a counter", skip: "You are on a tight budget" },
  { id: "hotorgshallen", name: "Hötorgshallen", area: "Norrmalm", addr: "Hötorget", lat: 59.3353, lng: 18.0632, cuts: ["og"], ver: 0,
    line: "A food hall with delis, lunch counters and stalls from many countries.", get: "Graze across a few stalls", skip: "You want table service" },
  { id: "prinsen", name: "Restaurang Prinsen", area: "Norrmalm", addr: "Mäster Samuelsgatan 4", lat: 59.3354, lng: 18.0705, cuts: ["og"], ver: 0,
    line: "A classic Stockholm dining room with traditional dishes.", get: "Husmanskost, the traditional Swedish plates", skip: "You want something experimental" },

  /* ---- Vegan Delight: addresses from 2023-26 guides (yourlivingcity, visitstockholm); check hours before going ---- */
  { id: "hermans", name: "Hermans", area: "Södermalm", addr: "Fjällgatan 23B", lat: 59.3190, lng: 18.0830, cuts: ["vegan", "friends", "date"], ver: 1,
    line: "One of the city's first vegan restaurants, known for a big buffet with a view over Gamla Stan and Djurgården.", get: "The buffet, at a window table", skip: "You want a quiet, small room" },
  { id: "my-vegina", name: "My Vegina", area: "Vasastan", addr: "Norrtullsgatan 21", lat: 59.3438, lng: 18.0505, cuts: ["vegan", "friends"], ver: 1,
    line: "Lush, tropical-feeling vegan place cooking from scratch: ramen, dahl, smoothies, big portions.", get: "The ramen or the dahl", skip: "You are after a light snack" },
  { id: "fern-fika", name: "Fern & Fika", area: "Södermalm", addr: "Langholmsgatan 11", lat: 59.3150, lng: 18.0330, cuts: ["vegan", "fika", "breakfast"], ver: 1,
    line: "Fully vegan, organic, white-sugar-free café with breakfast, lunch, cakes and gluten-free options.", get: "A cake and a non-coffee latte", skip: "You want a classic cinnamon bun" },
  { id: "mahalo", name: "Mahalo", area: "Södermalm", addr: "Hornsgatan 61", lat: 59.3178, lng: 18.0585, cuts: ["vegan", "brunch"], ver: 1,
    line: "Plant-based breakfast and lunch spot open since 2015, with bowls and pancakes. A second branch is on Odengatan.", get: "A bowl or the pancakes", skip: "You want table service in the evening" },
  { id: "hermitage", name: "Hermitage", area: "Gamla Stan", addr: "Stora Nygatan 11", lat: 59.3243, lng: 18.0702, cuts: ["vegan", "friends"], ver: 1,
    line: "All-you-can-eat vegan restaurant in the old town, with a large share of organic dishes.", get: "Go hungry and do a few rounds", skip: "You dislike buffets" },
  { id: "vaxthuset", name: "Växthuset", area: "Södermalm", addr: "Hammarby Slussväg 2", lat: 59.3075, lng: 18.0765, cuts: ["vegan", "date"], ver: 1,
    line: "A 100% plant-based restaurant under the Skanstull bridge, built on seasonal Nordic produce.", get: "The seasonal menu", skip: "You want something central" },
  { id: "chouchou", name: "Chouchou", area: "Norrmalm", addr: "Mäster Samuelsgatan 18", lat: 59.3358, lng: 18.0670, cuts: ["vegan", "date", "wine"], ver: 1,
    line: "Seasonal, mostly organic plant-based menu with natural wines and DJs late in the evening, inside Mood Gallery.", get: "A shared dinner with natural wine", skip: "You want a quiet early night" },
  { id: "delivore", name: "Delivore", area: "Södermalm", addr: "Åsögatan 116", lat: 59.3138, lng: 18.0905, cuts: ["vegan", "coffee", "fika"], ver: 1,
    line: "Café inside the Goodstore vegan and vegetarian grocery: juices, pastries, wraps and smoothies.", get: "A wrap and a pastry", skip: "You want a long sit-down meal" },
  { id: "lao-wai", name: "Lao Wai", area: "Norrmalm", addr: "Luntmakargatan 74", lat: 59.3410, lng: 18.0560, cuts: ["vegan", "friends"], ver: 1,
    line: "Chinese vegetarian cooking with Sichuan and Taiwanese touches, made without egg or dairy.", get: "Anything with the Sichuan heat", skip: "You cannot take spice" },

  /* ---- Viral Food: each has a published source (Time Out Stockholm, thatsup, Mothership); pins approximate ---- */
  { id: "bunzy", name: "Bunzy", area: "Vasastan", addr: "Hagagatan 37", lat: 59.3425, lng: 18.0425, cuts: ["viral", "fika", "sweet"], ver: 1,
    line: "Social-media-famous American-style cinnamon buns baked in trays and loaded with frosting. Queues hit about 40 minutes the day after it opened (Aug 2026).", get: "Hot honey and pepperoni, or the Biscoff", skip: "You will not queue. Open Thursday to Sunday only." },
  { id: "machi-machi", name: "Machi Machi", area: "Norrmalm", addr: "Sergels Torg 29", lat: 59.3326, lng: 18.0627, cuts: ["viral", "sweet"], ver: 1,
    line: "Taiwanese bubble tea shop where Uncle Roger filmed a video that passed 1.4 million views within days (2020).", get: "A classic milk tea with boba", skip: "You are in a hurry at peak time" },
  { id: "sweet-burger", name: "Sweet Burger", area: "Norrmalm", addr: "Drottninggatan 81a", lat: 59.3395, lng: 18.0590, cuts: ["viral", "sweet"], ver: 1,
    line: "Dessert café serving the Dubai-chocolate trend with strawberries, pistachio cream and Nutella.", get: "The Dubai chocolate", skip: "You do not like very sweet things" }
];

/* Starter suggestions: queued by the editor, not by readers. They show as ? pins and start with zero votes. */
var QUEUE = [
  { id: "q-1", name: "Café Tabac", area: "Gamla Stan", cuts: ["fika"], lat: 59.3242, lng: 18.0690, why: "A vintage-style café on Stora Nygatan. Worth a look for fika.", get: "", skip: "" },
  { id: "q-2", name: "Konditori Tre Indianer", area: "Gamla Stan", cuts: ["fika"], lat: 59.3233, lng: 18.0722, why: "Vintage-style café in the old town. Readers, tell us what to order.", get: "", skip: "" },
  { id: "q-3", name: "Kaffeverket", area: "Vasastan", cuts: ["coffee"], lat: 59.3425, lng: 18.0510, why: "Strong espresso on Sankt Eriksgatan. Is it your regular?", get: "", skip: "" },
  { id: "q-4", name: "Bröd & Salt", area: "Östermalm", cuts: ["breakfast"], lat: 59.3362, lng: 18.0710, why: "All-day menu and lunch sandwiches. Which branch is best?", get: "", skip: "" },
  { id: "q-5", name: "Petite France", area: "Kungsholmen", cuts: ["fika"], lat: 59.3308, lng: 18.0378, why: "Croissants, tarts and baguettes near Kungsholms strand.", get: "", skip: "" },
  { id: "q-6", name: "Tössebageriet", area: "Östermalm", cuts: ["fika", "sweet"], lat: 59.3395, lng: 18.0875, why: "Known for its semla. Worth voting on before Lent.", get: "", skip: "" },
  { id: "q-7", name: "Svedjan Bageri", area: "Södermalm", cuts: ["fika", "sweet"], lat: 59.3100, lng: 18.0590, why: "Family-farm dairy, pearl-sugar cinnamon buns and seaberry saffron buns.", get: "", skip: "" },
  { id: "q-8", name: "Bergstrands Bageri", area: "Vasastan", cuts: ["fika"], lat: 59.3430, lng: 18.0470, why: "Semlor, saffron doughnuts and sandwiches on homemade buns.", get: "", skip: "" }
];

/* ===== GEOGRAPHY: [lng, lat] rings. Schematic, hand-traced from known landmarks, not survey data. ===== */
var GEO = {
  mainland: [[18.030,59.3700],[18.030,59.3470],[18.034,59.3438],[18.040,59.3425],[18.043,59.3405],[18.0485,59.3385],[18.0505,59.3350],[18.0545,59.3322],[18.0590,59.3300],[18.0615,59.3285],[18.064,59.3283],[18.070,59.3291],[18.0745,59.3283],[18.079,59.3280],[18.0805,59.3296],[18.079,59.3312],[18.080,59.3322],[18.087,59.3330],[18.096,59.3338],[18.106,59.3348],[18.118,59.3345],[18.130,59.3362],[18.142,59.3390],[18.160,59.3420],[18.170,59.3700]],
  kungsholmen: [[18.000,59.3335],[18.020,59.3385],[18.033,59.3400],[18.041,59.3385],[18.0455,59.3350],[18.050,59.3310],[18.0555,59.3282],[18.053,59.3268],[18.042,59.3265],[18.030,59.3262],[18.016,59.3258],[18.004,59.3262],[17.998,59.3290]],
  sodermalm: [[18.0725,59.3203],[18.078,59.3208],[18.084,59.3195],[18.0905,59.3175],[18.0985,59.3155],[18.1055,59.3140],[18.1100,59.3115],[18.1050,59.3085],[18.0950,59.3050],[18.0830,59.3070],[18.070,59.3050],[18.055,59.3040],[18.040,59.3030],[18.025,59.3040],[18.010,59.3060],[18.000,59.3090],[17.996,59.3120],[17.998,59.3170],[18.001,59.3190],[18.020,59.3190],[18.034,59.3183],[18.045,59.3198],[18.056,59.3205],[18.065,59.3198],[18.0705,59.3195]],
  gamlastan: [[18.0632,59.3240],[18.0650,59.3262],[18.0680,59.3272],[18.0720,59.3270],[18.0752,59.3258],[18.0765,59.3240],[18.0750,59.3218],[18.0710,59.3212],[18.0670,59.3218]],
  skeppsholmen: [[18.0810,59.3262],[18.0850,59.3272],[18.0890,59.3262],[18.0870,59.3245],[18.0830,59.3243]],
  djurgarden: [[18.0930,59.3290],[18.1000,59.3305],[18.1100,59.3318],[18.1200,59.3318],[18.1330,59.3330],[18.1400,59.3305],[18.1380,59.3260],[18.1280,59.3225],[18.1180,59.3215],[18.1080,59.3200],[18.0990,59.3205],[18.0930,59.3225],[18.0905,59.3255]],
  langholmen: [[18.000,59.3210],[18.015,59.3225],[18.030,59.3225],[18.031,59.3208],[18.015,59.3200]]
};
var PARKS = [
  [[18.0950,59.3300],[18.1100,59.3312],[18.1250,59.3312],[18.1370,59.3322],[18.1385,59.3280],[18.1280,59.3238],[18.1170,59.3228],[18.1070,59.3215],[18.1000,59.3222],[18.0950,59.3250]],
  [[18.0735,59.3365],[18.0800,59.3365],[18.0800,59.3382],[18.0740,59.3385]],
  [[18.0690,59.3300],[18.0730,59.3300],[18.0730,59.3314],[18.0690,59.3314]],
  [[18.1000,59.3440],[18.1300,59.3430],[18.1350,59.3500],[18.1000,59.3500]],
  [[18.0480,59.3130],[18.0560,59.3140],[18.0570,59.3105],[18.0470,59.3100]],
  [[18.0090,59.3310],[18.0170,59.3322],[18.0180,59.3300],[18.0100,59.3295]]
];
var STREETS = [
  [[18.0705,59.3190],[18.0640,59.3182],[18.0560,59.3176],[18.0480,59.3170],[18.0400,59.3162],[18.0343,59.3158],[18.0260,59.3170],[18.0170,59.3182]],
  [[18.0725,59.3192],[18.0738,59.3145],[18.0757,59.3080],[18.0775,59.3045]],
  [[18.0690,59.3147],[18.0816,59.3147],[18.0900,59.3135]],
  [[18.0630,59.3330],[18.0600,59.3370],[18.0555,59.3410],[18.0500,59.3450],[18.0460,59.3500]],
  [[18.0780,59.3318],[18.0735,59.3354],[18.0690,59.3395],[18.0620,59.3430]],
  [[18.0795,59.3360],[18.0860,59.3382],[18.0910,59.3390],[18.1000,59.3395]],
  [[18.0735,59.3352],[18.0630,59.3353],[18.0540,59.3347],[18.0460,59.3340]],
  [[18.0645,59.3285],[18.0640,59.3330],[18.0620,59.3380],[18.0595,59.3430]],
  [[18.0700,59.3435],[18.0463,59.3430]]
];
var WATER_LABELS = [
  { t: "Mälaren", lng: 17.9985, lat: 59.3420 }, { t: "Riddarfjärden", lng: 18.0430, lat: 59.3231 },
  { t: "Saltsjön", lng: 18.0905, lat: 59.3218 }, { t: "Djurgårdsbrunnsviken", lng: 18.1150, lat: 59.3335 }
];
var AREA_LABELS = [
  { t: "Södermalm", lng: 18.0450, lat: 59.3100 }, { t: "Kungsholmen", lng: 18.0190, lat: 59.3335 },
  { t: "Norrmalm", lng: 18.0600, lat: 59.3320 }, { t: "Östermalm", lng: 18.0920, lat: 59.3380 },
  { t: "Vasastan", lng: 18.0450, lat: 59.3480 }, { t: "Djurgården", lng: 18.1180, lat: 59.3262 },
  { t: "Gamla Stan", lng: 18.0698, lat: 59.3228 }
];
