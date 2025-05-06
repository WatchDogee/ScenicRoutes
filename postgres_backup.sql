-- PostgreSQL dump converted from MySQL
--
-- Database: ScenicRoutesDB
-- ------------------------------------------------------

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET timezone = 'UTC';

--
-- Table structure for table "cache"
--

DROP TABLE IF EXISTS "cache";
CREATE TABLE "cache" (
  "key" varchar(255) NOT NULL,
  "value" text NOT NULL,
  "expiration" integer NOT NULL,
  PRIMARY KEY ("key")
);

--
-- Table structure for table "cache_locks"
--

DROP TABLE IF EXISTS "cache_locks";
CREATE TABLE "cache_locks" (
  "key" varchar(255) NOT NULL,
  "owner" varchar(255) NOT NULL,
  "expiration" integer NOT NULL,
  PRIMARY KEY ("key")
);

--
-- Table structure for table "migrations"
--

DROP TABLE IF EXISTS "migrations";
CREATE TABLE "migrations" (
  "id" serial NOT NULL,
  "migration" varchar(255) NOT NULL,
  "batch" integer NOT NULL,
  PRIMARY KEY ("id")
);

--
-- Dumping data for table "migrations"
--

INSERT INTO "migrations" VALUES (1,'2024_03_19_000000_create_users_table',1),(2,'2024_03_21_add_profile_picture_to_users',1),(3,'2025_04_22_190517_create_saved_roads_table',1),(4,'2025_04_22_190518_create_reviews_table',1),(5,'2025_04_22_190519_add_comment_to_reviews_table',1),(6,'2025_04_22_190519_create_comments_table',1),(7,'2025_04_22_221752_create_personal_access_tokens_table',1),(8,'2025_04_23_223054_add_description_to_saved_roads_table',1),(9,'2025_04_24_221752_create_cache_table',1),(10,'2025_04_24_221919_create_sessions_table',1),(11,'2025_04_26_add_profile_picture_to_users_table',1),(12,'2025_04_30_214356_create_password_reset_tokens_table',1),(13,'2025_05_01_000000_add_elevation_data_to_saved_roads_table',1),(14,'2025_05_02_101137_add_username_to_users_table',1),(15,'2025_05_02_190656_create_user_settings_table',1),(16,'2025_05_03_000000_create_points_of_interest_table',1),(17,'2025_05_03_000001_create_poi_photos_table',1),(18,'2025_05_03_000002_create_poi_reviews_table',1),(19,'2025_05_03_000003_create_review_photos_table',1),(20,'2025_05_03_000004_create_road_photos_table',1);

--
-- Table structure for table "password_reset_tokens"
--

DROP TABLE IF EXISTS "password_reset_tokens";
CREATE TABLE "password_reset_tokens" (
  "email" varchar(255) NOT NULL,
  "token" varchar(255) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("email")
);

--
-- Table structure for table "users"
--

DROP TABLE IF EXISTS "users" CASCADE;
CREATE TABLE "users" (
  "id" bigserial NOT NULL,
  "name" varchar(255) NOT NULL,
  "username" varchar(255) DEFAULT NULL,
  "email" varchar(255) NOT NULL,
  "profile_picture" varchar(255) DEFAULT NULL,
  "email_verified_at" timestamp NULL DEFAULT NULL,
  "password" varchar(255) NOT NULL,
  "remember_token" varchar(100) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("email"),
  UNIQUE ("username")
);

--
-- Dumping data for table "users"
--

INSERT INTO "users" VALUES (1,'Test User','testuser','test@example.com',NULL,'2025-05-02 21:53:50','$2y$12$BWJWzwl0bWZBXrr9AoPOsuGAqvtQ9uVPJed3KFM1bqNC4IAPGopUe',NULL,'2025-05-02 21:53:50','2025-05-02 21:53:50'),(2,'watchdoge','watchdoge','mairiszeps@gmail.com','profile-pictures/profile-2-1746223596.jpg','2025-05-02 22:05:57','$2y$12$Jyr5BkQ43i7WUQlvzDzRQuj.Agb9UFel8KwmmgOa.pO0DreipP6uS',NULL,'2025-05-02 22:05:49','2025-05-02 22:06:36'),(3,'test','test','test@test.test','profile-pictures/profile-3-1746223839.png','2025-05-02 22:09:29','$2y$12$Uvau60WigKPfbleq6Lmj7uRzxSAGZbGacyHIccdwYpuBLE5fadzea',NULL,'2025-05-02 22:09:22','2025-05-02 22:10:39');

--
-- Table structure for table "saved_roads"
--

DROP TABLE IF EXISTS "saved_roads" CASCADE;
CREATE TABLE "saved_roads" (
  "id" bigserial NOT NULL,
  "user_id" bigint NOT NULL,
  "road_name" varchar(255) DEFAULT NULL,
  "road_surface" varchar(255) DEFAULT NULL,
  "road_coordinates" jsonb NOT NULL,
  "twistiness" decimal(8,4) DEFAULT NULL,
  "corner_count" integer DEFAULT NULL,
  "length" decimal(10,2) DEFAULT NULL,
  "is_public" boolean NOT NULL DEFAULT false,
  "average_rating" decimal(3,2) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  "description" text DEFAULT NULL,
  "elevation_gain" decimal(10,2) DEFAULT NULL,
  "elevation_loss" decimal(10,2) DEFAULT NULL,
  "max_elevation" decimal(10,2) DEFAULT NULL,
  "min_elevation" decimal(10,2) DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "saved_roads" ADD CONSTRAINT "saved_roads_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

--
-- Dumping data for table "saved_roads"
--

INSERT INTO "saved_roads" VALUES (1,2,'Balvi – Celmene – Sita',NULL,'[[57.1645965, 27.1420359], [57.1643379, 27.1419993], [57.1638324, 27.1420278], [57.1635121, 27.1420156], [57.1632859, 27.1419851], [57.1626079, 27.1417663], [57.1623324, 27.1415711], [57.1617859, 27.1410575], [57.1616457, 27.1410129], [57.161457, 27.1409682], [57.1612325, 27.1410336], [57.1609808, 27.1413106], [57.1604792, 27.1424023], [57.1602742, 27.1429467], [57.1601416, 27.1434345], [57.1599977, 27.1439895], [57.1598663, 27.1443965], [57.1596801, 27.1448452], [57.1593046, 27.1453519], [57.1589006, 27.1458061], [57.1586686, 27.1461374], [57.1581198, 27.147178], [57.1579105, 27.147589], [57.1574894, 27.148416], [57.1569225, 27.1496711], [57.1566643, 27.1502515], [57.1565069, 27.1505017], [57.1564108, 27.1505927], [57.156268, 27.1507277], [57.156027, 27.1508292], [57.1557271, 27.1508371], [57.1553886, 27.150847], [57.1550571, 27.1509361], [57.1546457, 27.1510602], [57.1542834, 27.151215], [57.1540748, 27.1512466], [57.1538692, 27.1511883], [57.1537063, 27.1510482], [57.153303, 27.1506304], [57.1531619, 27.1505274], [57.1526315, 27.1504388], [57.1525098, 27.1504374], [57.152364, 27.1504631], [57.1520941, 27.1506375], [57.1518034, 27.150862], [57.1515893, 27.1509106], [57.1514885, 27.1508934], [57.1510403, 27.1507762], [57.1509131, 27.1507505], [57.150734, 27.150759], [57.1504386, 27.1508591], [57.150026, 27.1511021], [57.1493808, 27.1514653], [57.1477096, 27.1522901], [57.1469061, 27.1526819], [57.146226, 27.1529692], [57.1450517, 27.1533523], [57.1444545, 27.1535754], [57.1438379, 27.1538625], [57.1433943, 27.1540344], [57.142727, 27.1542602], [57.1421772, 27.1544269], [57.1419672, 27.1545203], [57.1419336, 27.1545439], [57.141734, 27.1546839], [57.1416183, 27.1547824], [57.1415158, 27.1549134], [57.1414464, 27.1549984], [57.1413425, 27.1551989], [57.1412462, 27.1554844], [57.1410561, 27.1564115], [57.1409887, 27.1568557], [57.1409558, 27.1573352], [57.1409732, 27.1582444], [57.1410334, 27.1589418], [57.1412918, 27.1613115], [57.1414232, 27.1624118], [57.1416024, 27.163748], [57.1416613, 27.1646713], [57.1418191, 27.166518], [57.1420261, 27.1689548], [57.1420707, 27.1703794], [57.142027, 27.1719015], [57.1420203, 27.1740243], [57.1418702, 27.1765911], [57.1418673, 27.1766227], [57.1416732, 27.1787944], [57.1416434, 27.17937], [57.1413799, 27.1843522], [57.1412906, 27.1855489], [57.1411879, 27.1863777], [57.1407995, 27.190371], [57.1406862, 27.1914087], [57.1405077, 27.191908], [57.1402637, 27.1923812], [57.1395625, 27.1937414], [57.1391795, 27.1952994], [57.138985, 27.1960909], [57.1387349, 27.1968345], [57.1385935, 27.1971384], [57.138154, 27.1980889], [57.1380054, 27.1984709], [57.137926, 27.1987249], [57.1378632, 27.1989595], [57.1378543, 27.198993], [57.1377247, 27.1996033], [57.1376433, 27.2001669], [57.1375384, 27.2012923], [57.1373897, 27.2031525], [57.1374687, 27.2057715], [57.1376385, 27.2127613], [57.1376787, 27.2165329], [57.1376726, 27.2167878]]',0.0020,48,6774.73,true,3.50,'2025-05-02 22:06:55','2025-05-02 22:42:28','I mean is alright',87.00,70.00,128.00,106.00),(2,3,'Garkalne — Alauksts',NULL,'[[57.0241593, 24.968023], [57.0242658, 24.972986], [57.0242811, 24.973701], [57.0247031, 24.9934223], [57.0247264, 24.9941935], [57.0249612, 25.0055358], [57.0250415, 25.0094171], [57.0251306, 25.0119987], [57.0251366, 25.0121735], [57.0252936, 25.0146986], [57.0255101, 25.017515], [57.0257438, 25.0197623], [57.0258346, 25.0206357], [57.0261582, 25.0230233], [57.0265579, 25.0256293], [57.0271818, 25.0290806], [57.0274969, 25.0305975], [57.0278715, 25.0322722], [57.028581, 25.0351603], [57.0292964, 25.037759], [57.0301091, 25.0403527], [57.0306805, 25.0420431], [57.031465, 25.0441831], [57.0321496, 25.0459561], [57.0335748, 25.0495983], [57.0340324, 25.0507394], [57.0353988, 25.0542463], [57.0355092, 25.0545197], [57.0365435, 25.0570819], [57.0369448, 25.0582067], [57.0372039, 25.0588831], [57.0375082, 25.0595749], [57.0376946, 25.0600538], [57.0378446, 25.0605764], [57.037893, 25.0607452], [57.0381483, 25.0616927], [57.0383776, 25.0627463], [57.0385433, 25.0635942], [57.0386737, 25.0641607], [57.0388004, 25.064632], [57.0389703, 25.0651141], [57.0391173, 25.0655677], [57.039245, 25.0660302], [57.0393599, 25.0665465], [57.0395043, 25.0670845], [57.039965, 25.0685294], [57.0403551, 25.0698372], [57.0406652, 25.0708126], [57.0408518, 25.0713352], [57.0410939, 25.0719517], [57.0413907, 25.0726219], [57.0416019, 25.0730156], [57.0418289, 25.0733154], [57.0421419, 25.0737432], [57.0424117, 25.0740628], [57.0427001, 25.0744493], [57.042847, 25.0747238], [57.0430145, 25.0751999], [57.0431781, 25.0757265], [57.0433246, 25.0761085], [57.0434834, 25.0764694], [57.043683, 25.0768183], [57.0438355, 25.0771383], [57.0439125, 25.0774416], [57.043953, 25.0777414], [57.0439719, 25.0781061], [57.0440057, 25.0807647], [57.0441512, 25.0835532], [57.0441877, 25.0840262], [57.0442517, 25.0844848], [57.0443466, 25.0849974], [57.0444284, 25.0852837], [57.0448988, 25.0869633], [57.04493, 25.0870774], [57.0451374, 25.0878366], [57.0453524, 25.088681], [57.0455649, 25.0896509], [57.0458716, 25.0913497], [57.0461092, 25.0928233], [57.0462378, 25.0934988], [57.0463547, 25.0940371], [57.0464249, 25.0943121], [57.0465893, 25.0950273], [57.0468136, 25.096329], [57.0469186, 25.0970921], [57.0469495, 25.0976507], [57.0469166, 25.0992752], [57.0469057, 25.1003416], [57.0468615, 25.1010074], [57.0467752, 25.101684], [57.0465327, 25.1035853], [57.0464482, 25.1044502], [57.0464166, 25.1049506], [57.0463732, 25.1055329], [57.0463013, 25.1061728], [57.0461705, 25.1069355], [57.0461266, 25.1074342], [57.0461828, 25.1079617], [57.0464333, 25.1091817], [57.046733, 25.1104847], [57.0469969, 25.1115917], [57.0473, 25.1126512], [57.0474054, 25.1129121], [57.0475305, 25.1132019], [57.0477315, 25.1136593], [57.0483113, 25.1156718], [57.0485104, 25.1162433], [57.0487605, 25.1168005], [57.0490857, 25.1173748], [57.0495781, 25.1180484], [57.0517959, 25.1212776], [57.0526349, 25.1225409], [57.0530232, 25.1231692], [57.053333, 25.1237651], [57.0536648, 25.1244979], [57.0539431, 25.125253], [57.0542548, 25.1261778], [57.0544039, 25.1266934], [57.0544942, 25.1271079], [57.0546571, 25.1276885], [57.0548161, 25.1282113], [57.0551337, 25.1289826], [57.0553768, 25.129624], [57.0555171, 25.1299873], [57.0556535, 25.1302712], [57.055824, 25.1305297], [57.0560121, 25.130745], [57.056727, 25.1314915], [57.0569058, 25.1317178], [57.0570296, 25.1319302], [57.0571337, 25.1321895], [57.0575525, 25.1337156], [57.0576594, 25.134171], [57.0577164, 25.1345503], [57.0577497, 25.1349368], [57.0577565, 25.1358623], [57.057726, 25.1368059], [57.0576434, 25.1379894], [57.0576306, 25.138367], [57.0576295, 25.1387338], [57.0576647, 25.1391813], [57.0577313, 25.1395783]]',0.0006,22,11547.81,true,NULL,'2025-05-02 22:12:21','2025-05-02 22:13:26',NULL,128.00,117.00,140.00,94.00);

--
-- Table structure for table "reviews"
--

DROP TABLE IF EXISTS "reviews" CASCADE;
CREATE TABLE "reviews" (
  "id" bigserial NOT NULL,
  "user_id" bigint NOT NULL,
  "saved_road_id" bigint NOT NULL,
  "rating" integer NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  "comment" text DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_saved_road_id_foreign" FOREIGN KEY ("saved_road_id") REFERENCES "saved_roads" ("id") ON DELETE CASCADE;

--
-- Dumping data for table "reviews"
--

INSERT INTO "reviews" VALUES (1,2,1,5,'2025-05-02 22:07:23','2025-05-02 22:07:23','I mean is alright'),(2,3,1,2,'2025-05-02 22:33:43','2025-05-02 22:33:43','I mean is not alright');

--
-- Table structure for table "comments"
--

DROP TABLE IF EXISTS "comments" CASCADE;
CREATE TABLE "comments" (
  "id" bigserial NOT NULL,
  "user_id" bigint NOT NULL,
  "saved_road_id" bigint NOT NULL,
  "comment" text NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_saved_road_id_foreign" FOREIGN KEY ("saved_road_id") REFERENCES "saved_roads" ("id") ON DELETE CASCADE;

--
-- Table structure for table "personal_access_tokens"
--

DROP TABLE IF EXISTS "personal_access_tokens" CASCADE;
CREATE TABLE "personal_access_tokens" (
  "id" bigserial NOT NULL,
  "tokenable_type" varchar(255) NOT NULL,
  "tokenable_id" bigint NOT NULL,
  "name" varchar(255) NOT NULL,
  "token" varchar(64) NOT NULL,
  "abilities" text DEFAULT NULL,
  "last_used_at" timestamp NULL DEFAULT NULL,
  "expires_at" timestamp NULL DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("token")
);

-- Add index
CREATE INDEX "personal_access_tokens_tokenable_type_tokenable_id_index" ON "personal_access_tokens" ("tokenable_type", "tokenable_id");

--
-- Dumping data for table "personal_access_tokens"
--

INSERT INTO "personal_access_tokens" VALUES (1,'App\\Models\\User',2,'auth_token','9cf8f253fb6e6f06afe9395ab93dd33a7ec20a536904d5adf28e9f8422c5507b','["*"]',NULL,NULL,'2025-05-02 22:05:51','2025-05-02 22:05:51'),(3,'App\\Models\\User',3,'auth_token','a69241634b4ffb02bcdfcd4a489268f75f065d9bc6a88453499b895d07c5035d','["*"]',NULL,NULL,'2025-05-02 22:09:24','2025-05-02 22:09:24'),(8,'App\\Models\\User',2,'auth_token','f76fceafb8a3f78dc5fd7f1971afe7ee343ff10a0e8bce00103ecc270a36f329','["*"]','2025-05-02 22:43:51',NULL,'2025-05-02 22:42:08','2025-05-02 22:43:51'),(9,'App\\Models\\User',2,'auth_token','53832357ca8fdda902b11f6cd7be32957a1229ba9cbe218389f911ad54e7dbdb','["*"]','2025-05-03 19:31:45',NULL,'2025-05-03 18:41:20','2025-05-03 19:31:45');

--
-- Table structure for table "sessions"
--

DROP TABLE IF EXISTS "sessions" CASCADE;
CREATE TABLE "sessions" (
  "id" varchar(255) NOT NULL,
  "user_id" bigint DEFAULT NULL,
  "ip_address" varchar(45) DEFAULT NULL,
  "user_agent" text DEFAULT NULL,
  "payload" text NOT NULL,
  "last_activity" integer NOT NULL,
  PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "sessions_user_id_index" ON "sessions" ("user_id");
CREATE INDEX "sessions_last_activity_index" ON "sessions" ("last_activity");

--
-- Table structure for table "points_of_interest"
--

DROP TABLE IF EXISTS "points_of_interest" CASCADE;
CREATE TABLE "points_of_interest" (
  "id" bigserial NOT NULL,
  "user_id" bigint DEFAULT NULL,
  "name" varchar(255) NOT NULL,
  "type" varchar(255) NOT NULL,
  "subtype" varchar(255) DEFAULT NULL,
  "latitude" decimal(10,7) NOT NULL,
  "longitude" decimal(10,7) NOT NULL,
  "description" text DEFAULT NULL,
  "properties" jsonb DEFAULT NULL,
  "osm_id" varchar(255) DEFAULT NULL,
  "is_verified" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "points_of_interest" ADD CONSTRAINT "points_of_interest_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;

--
-- Table structure for table "poi_photos"
--

DROP TABLE IF EXISTS "poi_photos" CASCADE;
CREATE TABLE "poi_photos" (
  "id" bigserial NOT NULL,
  "point_of_interest_id" bigint NOT NULL,
  "user_id" bigint DEFAULT NULL,
  "photo_path" varchar(255) NOT NULL,
  "caption" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "poi_photos" ADD CONSTRAINT "poi_photos_point_of_interest_id_foreign" FOREIGN KEY ("point_of_interest_id") REFERENCES "points_of_interest" ("id") ON DELETE CASCADE;
ALTER TABLE "poi_photos" ADD CONSTRAINT "poi_photos_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;

--
-- Table structure for table "poi_reviews"
--

DROP TABLE IF EXISTS "poi_reviews" CASCADE;
CREATE TABLE "poi_reviews" (
  "id" bigserial NOT NULL,
  "point_of_interest_id" bigint NOT NULL,
  "user_id" bigint DEFAULT NULL,
  "rating" decimal(2,1) NOT NULL,
  "comment" text DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "poi_reviews" ADD CONSTRAINT "poi_reviews_point_of_interest_id_foreign" FOREIGN KEY ("point_of_interest_id") REFERENCES "points_of_interest" ("id") ON DELETE CASCADE;
ALTER TABLE "poi_reviews" ADD CONSTRAINT "poi_reviews_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;

--
-- Table structure for table "review_photos"
--

DROP TABLE IF EXISTS "review_photos" CASCADE;
CREATE TABLE "review_photos" (
  "id" bigserial NOT NULL,
  "review_id" bigint NOT NULL,
  "photo_path" varchar(255) NOT NULL,
  "caption" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_foreign" FOREIGN KEY ("review_id") REFERENCES "reviews" ("id") ON DELETE CASCADE;

--
-- Dumping data for table "review_photos"
--

INSERT INTO "review_photos" VALUES (1,1,'review-photos/uZkm7WBnNYlem9PBs0Pm2Js2sEDK3gt3ivEcZsO1.jpg',NULL,'2025-05-02 22:32:35','2025-05-02 22:32:35'),(2,2,'review-photos/gGfdOLCJ1U3aHb18EAgsIlgaJzvRpdPVAQaKf8SM.png',NULL,'2025-05-02 22:33:50','2025-05-02 22:33:50');

--
-- Table structure for table "road_photos"
--

DROP TABLE IF EXISTS "road_photos" CASCADE;
CREATE TABLE "road_photos" (
  "id" bigserial NOT NULL,
  "saved_road_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "photo_path" varchar(255) NOT NULL,
  "caption" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "road_photos" ADD CONSTRAINT "road_photos_saved_road_id_foreign" FOREIGN KEY ("saved_road_id") REFERENCES "saved_roads" ("id") ON DELETE CASCADE;
ALTER TABLE "road_photos" ADD CONSTRAINT "road_photos_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

--
-- Dumping data for table "road_photos"
--

INSERT INTO "road_photos" VALUES (1,1,2,'road-photos/r6Z8ZL6cjq8Hk5ZhzBAtw2KaWdY0FdCu47Y3PJ8w.jpg',NULL,'2025-05-02 22:07:13','2025-05-02 22:07:13'),(2,1,2,'road-photos/wZUsMq341fd1fKyqs334xljD23yI3V2i4bPiqmUS.png',NULL,'2025-05-02 22:43:35','2025-05-02 22:43:35');

--
-- Table structure for table "user_settings"
--

DROP TABLE IF EXISTS "user_settings" CASCADE;
CREATE TABLE "user_settings" (
  "id" bigserial NOT NULL,
  "user_id" bigint NOT NULL,
  "key" varchar(255) NOT NULL,
  "value" text NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("user_id", "key")
);

-- Add foreign key constraint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- Set sequence values for all tables with serial/bigserial columns
SELECT setval(pg_get_serial_sequence('"users"', 'id'), (SELECT MAX("id") FROM "users"));
SELECT setval(pg_get_serial_sequence('"saved_roads"', 'id'), (SELECT MAX("id") FROM "saved_roads"));
SELECT setval(pg_get_serial_sequence('"reviews"', 'id'), (SELECT MAX("id") FROM "reviews"));
SELECT setval(pg_get_serial_sequence('"comments"', 'id'), COALESCE((SELECT MAX("id") FROM "comments"), 1));
SELECT setval(pg_get_serial_sequence('"personal_access_tokens"', 'id'), (SELECT MAX("id") FROM "personal_access_tokens"));
SELECT setval(pg_get_serial_sequence('"points_of_interest"', 'id'), COALESCE((SELECT MAX("id") FROM "points_of_interest"), 1));
SELECT setval(pg_get_serial_sequence('"poi_photos"', 'id'), COALESCE((SELECT MAX("id") FROM "poi_photos"), 1));
SELECT setval(pg_get_serial_sequence('"poi_reviews"', 'id'), COALESCE((SELECT MAX("id") FROM "poi_reviews"), 1));
SELECT setval(pg_get_serial_sequence('"review_photos"', 'id'), (SELECT MAX("id") FROM "review_photos"));
SELECT setval(pg_get_serial_sequence('"road_photos"', 'id'), (SELECT MAX("id") FROM "road_photos"));
SELECT setval(pg_get_serial_sequence('"user_settings"', 'id'), COALESCE((SELECT MAX("id") FROM "user_settings"), 1));
SELECT setval(pg_get_serial_sequence('"migrations"', 'id'), (SELECT MAX("id") FROM "migrations"));

-- PostgreSQL dump completed
