"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql = require("sqlite3");
/*
TODO LIST:
-Save current rod to database
-View command
-Hide unexplored items
-Add shop and baits
*/
class FishGame {
    constructor(client) {
        this.client = client;
        this.playersDataTableName = "scores";
        this.players = [];
        this.initDatabase();
        this.maxRestBonus = 1000 * 3;
        this.loadData();
        process.on('exit', () => {
            this.database.close();
            console.log('Closed!');
        });
    }
    loadData() {
        this.itemData = [
            new Item(ItemEnum.sharkTooth, "Shark's tooth", Rarity.Rare, "Sharpy one", []),
            new Item(ItemEnum.leatherStrips, "Leather strips", Rarity.Uncommon, "Can be used to join elements", []),
            new Item(ItemEnum.ironStick, "Iron stick", Rarity.Rare, "Using this as a bat is not recommended", []),
            new Item(ItemEnum.strongBranch, "Strong branch", Rarity.Common, "Quite uncomfortable to hold", []),
            new Item(ItemEnum.ironStrips, "Iron strips", Rarity.Rare, "Can be used to join elements", []),
            new Item(ItemEnum.shortString, "Short String", Rarity.Common, "This string is strong and elastic but quite short", []),
            new Item(ItemEnum.splinterOfWood, "Splinter of wood", Rarity.Common, "Sharp splinter that can be used as a fishhook", []),
            new Item(ItemEnum.needle, "Needle", Rarity.Uncommon, "Can be used as a fishhook or for knitting", []),
            new Item(ItemEnum.pieceOfFiber, "Piece of fiber", Rarity.Uncommon, "TODO", []),
        ];
        this.itemData.push(new Item(ItemEnum.longString, "Long string", Rarity.Common, "This string can be used to hold a fishhook", [
            new ItemStack(this.getItem(ItemEnum.shortString), 5),
        ]));
        this.itemData.push(new Rod(ItemEnum.woodenStick, "Wooden Stick", Rarity.Worthless, "Solid wooden stick you found nearby", [], 2));
        this.itemData.push(new Rod(ItemEnum.woodFishingPole, "Wood Fishing Pole", Rarity.Common, "A couple of pieces joined together to resemble a fishing rod", [
            new ItemStack(this.getItem(ItemEnum.strongBranch), 1),
            new ItemStack(this.getItem(ItemEnum.splinterOfWood), 1),
            new ItemStack(this.getItem(ItemEnum.longString), 1),
        ], 5));
        this.itemData.push(new Rod(ItemEnum.reinforcedFishingPole, "Reinforced Fishing Pole", Rarity.Uncommon, "Hard and tough fishing pole.", [
            new ItemStack(this.getItem(ItemEnum.leatherStrips), 5),
            new ItemStack(this.getItem(ItemEnum.needle), 1),
            new ItemStack(this.getItem(ItemEnum.strongBranch), 1),
            new ItemStack(this.getItem(ItemEnum.pieceOfFiber), 5),
            new ItemStack(this.getItem(ItemEnum.longString), 1),
        ], 15));
        this.itemData.push(new Rod(ItemEnum.ironFishingPole, "Iron Fishing Rod", Rarity.Rare, "Fishing rod made of iron", [
            new ItemStack(this.getItem(ItemEnum.ironStick), 1),
            new ItemStack(this.getItem(ItemEnum.needle), 1),
            new ItemStack(this.getItem(ItemEnum.ironStrips), 20),
            new ItemStack(this.getItem(ItemEnum.longString), 1),
        ], 40));
        this.fishGroupData = [
            new FishGroup(Rarity.Worthless, 60, [
                new Fish("Plastic bottle", 0.5, 0, []),
                new Fish("Coca-cola can", 0.1, 0, []),
                new Fish("Algae", 1, 0, []),
                new Fish("Plastic bag", 0.2, 0, []),
                new Fish("Empty wallet", 0.3, 0, [])
            ]),
            new FishGroup(Rarity.Common, 40, [
                new Fish("Yellowfin Sculpin", 1.7, 1, []),
                new Fish("Whiting", 1.7, 2, []),
                new Fish("Tongue Sole", 1.4, 5, []),
                new Fish("Surfperch", 0.8, 7, []),
                new Fish("Striped Catfish", 2.5, 9, []),
                new Fish("Garbage Bag", 2, 0, [
                    new ItemStack(this.getItem(ItemEnum.strongBranch), 1),
                    new ItemStack(this.getItem(ItemEnum.shortString), 2)
                ])
            ]),
            new FishGroup(Rarity.Uncommon, 20, [
                new Fish("Brook Trout", 4.4, 11, []),
                new Fish("Barbel", 5, 16, []),
                new Fish("Sole", 0.4, 17, []),
                new Fish("Rockfish", 31, 22, []),
                new Fish("Bass", 4.9, 29, []),
                new Fish("Sweetfish", 1.4, 31, []),
                new Fish("Sewing box", 3, 0, [
                    new ItemStack(this.getItem(ItemEnum.needle), 4),
                    new ItemStack(this.getItem(ItemEnum.shortString), 10),
                ]),
                new Fish("Scratched shirt", 1.1, 0, [
                    new ItemStack(this.getItem(ItemEnum.pieceOfFiber), 2),
                ]),
            ]),
            new FishGroup(Rarity.Rare, 10, [
                new Fish("Shark", 50, 45, [
                    new ItemStack(this.getItem(ItemEnum.sharkTooth), 1)
                ]),
                new Fish("Gold nugget", 0.2, 60, []),
            ]),
            new FishGroup(Rarity.Epic, 2, [
                new Fish("Mysterious chest", 10, 100, [
                    new ItemStack(this.getItem(ItemEnum.ironStick), 1)
                ])
            ]),
            new FishGroup(Rarity.Legendary, 0.2, [
                new Fish("Loch Ness Monster", 2000, 20000, [
                    new ItemStack(this.getItem(ItemEnum.ironStick), 1)
                ])
            ]),
            new FishGroup(Rarity.Mythic, 0.01, [
                new Fish("Sea God", 50000, 400000, [
                    new ItemStack(this.getItem(ItemEnum.ironStick), 1)
                ])
            ])
        ];
        this.fishGroupData.forEach(fishGroup => {
            fishGroup.fishes.forEach(fish => {
                fish.rarity = fishGroup.rarity;
            });
        });
    }
    initDatabase() {
        this.database = new sql.Database(`./players.sqlite`);
        this.database.run(`CREATE TABLE IF NOT EXISTS ${this.playersDataTableName} (userId TEXT, gold INTEGER, lastMessageTime INTEGER, equipment STRING)`);
        //this.database.run(`ALTER TABLE ${this.playersDataTableName} ADD COLUMN equipment STRING`);
        this.database.all(`SELECT * FROM ${this.playersDataTableName}`, (err, rows) => {
            rows.forEach(row => {
                if (row.userId != null) {
                    var p = this.players.find(player => {
                        return player.userId == row.userId;
                    });
                    if (p == undefined) {
                        this.players.push(new Player(row.userId, row.gold, row.lastMessageTime, Equipment.fromString(row.equipment, this)));
                    }
                }
            });
        });
        setInterval(() => {
            this.updateDatabase();
        }, 20000);
    }
    updateDatabase() {
        this.players.forEach(player => {
            this.database.get(`SELECT * FROM ${this.playersDataTableName} WHERE userId = "${player.userId}"`, (err, row) => {
                if (!row) {
                    this.database.run(`INSERT INTO ${this.playersDataTableName} (userId, gold, lastMessageTime, equipment STRING) VALUES (?, ?, ?, ?)`, [player.userId, player.gold, player.lastMessageTime, player.equipment.toString()]);
                }
                else {
                    this.database.run(`UPDATE ${this.playersDataTableName} SET gold = ${player.gold}, lastMessageTime = ${player.lastMessageTime}, equipment = "${player.equipment.toString()}"  WHERE userId = "${player.userId}"`);
                }
            });
        });
    }
    receiveMessage(message) {
        if (message.content.startsWith("!fish")) {
            this.messageFish(message);
        }
        if (message.content.startsWith("!update")) {
            message.channel.send("Updating database..");
            this.updateDatabase();
            message.channel.send("Database updated!");
        }
        else if (message.content.startsWith("!give")) {
            this.messageGive(message);
        }
        else if (message.content.startsWith("!top")) {
            this.messageLeaderboard(message);
        }
        else if (message.content.startsWith("!scout")) {
            this.messageScout(message);
        }
        else if (message.content.startsWith("!craft")) {
            this.messageCraft(message);
        }
        else if (message.content.startsWith("!take") && message.author.id == "150994488515362817") {
            this.messageTake(message);
        }
        else if (message.content.startsWith("!eq") || message.content.startsWith("!equipment")) {
            this.messageEquipment(message);
        }
        else if (message.content.startsWith("!use")) {
            this.messageUse(message);
        }
        else if (message.content.startsWith("!wizardry") && message.author.id == "150994488515362817") {
            var player = this.getPlayer("150994488515362817");
            var rod = this.itemData.find(e => {
                return e.id == ItemEnum.ironFishingPole;
            });
            player.equipment.addItemStack(new ItemStack(rod, 1));
            message.channel.send("Abracadabra!");
        }
    }
    messageUse(message) {
        var player = this.getPlayer(message.author.id);
        var id = parseInt(this.getMessageValue(message, 1));
        if (Number.isSafeInteger(id)) {
            var item = this.getItem(id);
            var error = player.equipment.use(item);
            if (error == null) {
                message.channel.send(`${this.getUser(player.userId)} has used ${item.name}`);
            }
            else {
                message.channel.send(`Error: ${error}`);
            }
        }
        else {
            message.channel.send(`Invalid value!`);
        }
    }
    messageGive(message) {
        if (message.mentions.members.size > 0) {
            var receiver = message.mentions.members.array()[0];
            var amount = parseInt(this.getMessageValue(message, 2));
            if (amount > 0) {
                var p1 = this.getPlayer(message.author.id);
                var p2 = this.getPlayer(receiver.id);
                if (p1.gold < amount) {
                    message.channel.send(`You don't have enough gold!`);
                }
                else {
                    p1.gold -= amount;
                    p2.gold += amount;
                    message.channel.send(`${message.author.username} has given ${receiver.displayName} ${amount} gold!`);
                }
            }
            else {
                message.channel.send(`Invalid amount of gold!`);
            }
        }
        else {
            message.channel.send(`You haven't mentioned any users!`);
        }
    }
    messageFish(message) {
        var player = this.getPlayer(message.author.id);
        var deltaTime = Date.now() - player.lastMessageTime;
        player.lastMessageTime = Date.now();
        var magicalPower = this.magicalPower(deltaTime);
        var fish = this.catchAFish(magicalPower);
        var rod = player.equipment.currentRod;
        if (rod == null) {
            rod = this.getItem(ItemEnum.woodenStick);
        }
        if (rod.maxWeight >= fish.mass) {
            var loot;
            if (fish.drop.length > 0) {
                loot = fish.drop[Math.floor(Math.random() * fish.drop.length)];
            }
            var totalValue = player.gold + fish.value;
            player.gold = totalValue;
            var msg = `${this.getUser(player.userId)}, you've catched:\n${fish.getInfo()}`;
            if (loot != undefined) {
                msg += `You found a new item inside!\n${loot.item.getInfo()}`;
                player.equipment.addItemStack(loot);
            }
            msg += `You now have **${player.gold}** gold!`;
            message.channel.send(msg);
        }
        else {
            var msg = `${this.getUser(player.userId)}, you tried to fish:\n${fish.getInfo()}\n...but your ${rod.name} broke!`;
            if (rod.id == ItemEnum.woodenStick) {
                msg += ` Fortunately you found another ${rod.name} nearby!`;
            }
            else {
                player.equipment.break(rod);
            }
            message.channel.send(msg);
        }
    }
    messageLeaderboard(message) {
        this.players.sort((a, b) => {
            return b.gold - a.gold;
        });
        var msg = `Leaderboard:\n`;
        for (var i = 0; i < 5; i++) {
            var player = this.players[i];
            var user = this.client.users.find(u => {
                return u.id == player.userId;
            });
            msg += `${i + 1}. ${user.username} - ${player.gold} gold\n`;
        }
        message.channel.send(msg);
    }
    messageScout(message) {
        var scouted = message.mentions.members.array()[0];
        var player = this.getPlayer(scouted.id);
        var a = '';
        if (scouted.displayName == "-Filow-") {
            a += " does not invite people to play lol with him and";
        }
        message.channel.send(`${scouted.displayName}${a} has ${player.gold} gold.`);
    }
    messageTake(message) {
        var punished = message.mentions.members.array()[0];
        var player = this.getPlayer(punished.id);
        var amount = parseInt(this.getMessageValue(message, 2));
        player.gold -= amount;
        message.channel.send(`${punished} has been punished and lost ${amount} gold!`);
    }
    messageEquipment(message) {
        var player = this.getPlayer(message.author.id);
        var msg = player.equipment.getPreview();
        message.channel.send(msg);
    }
    messageCraft(message) {
        var id = parseInt(this.getMessageValue(message, 1));
        if (!Number.isSafeInteger(id)) {
            var msg = `Available items to craft:\n\n`;
            this.itemData.forEach(item => {
                if (item.recipe.length > 0) {
                    msg += `${item.getInfo()}${item.getRequirements()}\n`;
                }
            });
            message.author.send(msg);
        }
        else {
            var craftedItem = this.getItem(id);
            if (craftedItem.recipe.length > 0) {
                var player = this.getPlayer(message.author.id);
                var requirements = player.equipment.recipeRequirements(craftedItem.recipe);
                if (requirements.length == 0) {
                    player.equipment.craft(craftedItem);
                    message.channel.send(`Great! You have successfully crafted ${craftedItem.name}`);
                }
                else {
                    var msg = `You can't craft ${craftedItem.name}! You still need:\n`;
                    requirements.forEach(r => {
                        msg += `${r.getPreview()}\n`;
                    });
                    message.channel.send(msg);
                }
            }
            else {
                message.channel.send(`This item is not craftable!`);
            }
        }
    }
    getMessageValue(message, index) {
        var args = message.content.split(/[ ]+/);
        if (args.length > index) {
            return args[index];
        }
        else {
            return null;
        }
    }
    getUser(id) {
        return this.client.users.find(u => {
            return u.id == id;
        });
    }
    getPlayer(id) {
        var p;
        p = this.players.find(player => {
            return player.userId == id;
        });
        if (p == undefined) {
            p = new Player(id, 0, Date.now(), new Equipment([], this.getItem(ItemEnum.woodenStick)));
            this.players.push(p);
        }
        return p;
    }
    magicalPower(deltaTime) {
        if (deltaTime > this.maxRestBonus) {
            deltaTime = this.maxRestBonus;
        }
        return 10 - (deltaTime / this.maxRestBonus) * 9;
    }
    catchAFish(magicalPower) {
        var fish = this.rollFishGroup(magicalPower).getRandomFish();
        return fish;
    }
    rollFishGroup(magicalPower) {
        var sum = 0;
        this.fishGroupData.forEach(fishGroup => {
            fishGroup.tempProbability = Math.pow(fishGroup.probability, magicalPower);
            sum += fishGroup.tempProbability;
        });
        var roll = Math.random() * sum;
        var sum2 = 0;
        var result;
        this.fishGroupData.some(fishGroup => {
            if (sum2 + fishGroup.tempProbability > roll) {
                result = fishGroup;
                return true;
            }
            sum2 += fishGroup.tempProbability;
        });
        return result;
    }
    getItem(item) {
        return this.itemData.find(i => {
            return i.id == item;
        });
    }
}
module.exports = FishGame;
var Rarity;
(function (Rarity) {
    Rarity["Worthless"] = "Worthless";
    Rarity["Common"] = "Common";
    Rarity["Uncommon"] = "Uncommon";
    Rarity["Rare"] = "Rare";
    Rarity["Epic"] = "Epic";
    Rarity["Mythic"] = "Mythic";
    Rarity["Legendary"] = "Legendary";
})(Rarity || (Rarity = {}));
class Fish {
    constructor(name, mass, value, drop) {
        this.name = name;
        this.mass = mass;
        this.value = value;
        this.drop = drop;
    }
    getInfo() {
        return `**${this.name}**\n**Rarity:** ${this.rarity}\n**Weight:** ${this.mass}\n**Value:** ${this.value}\n`;
    }
}
class FishGroup {
    constructor(rarity, probability, fishes) {
        this.rarity = rarity;
        this.probability = probability;
        this.fishes = fishes;
        this.tempProbability;
    }
    getRandomFish() {
        return this.fishes[Math.floor(Math.random() * this.fishes.length)];
    }
}
class Player {
    constructor(userId, gold, lastMessageTime, equipment) {
        this.userId = userId,
            this.gold = gold,
            this.lastMessageTime = lastMessageTime;
        this.equipment = equipment;
    }
}
class Item {
    constructor(id, name, rarity, description, recipe) {
        this.id = id;
        this.name = name;
        this.rarity = rarity;
        this.description = description;
        this.recipe = recipe;
    }
    getType() {
        return `Material`;
    }
    getInfo() {
        var r = `**${this.name}**(id:${this.id})\n**Type:** ${this.getType()}\n**Rarity:** ${this.rarity}\n**Description:** _${this.description}_\n`;
        return r;
    }
    getRequirements() {
        var r = `**Crafting requirements:**\n`;
        this.recipe.forEach(itemStack => {
            r += `${itemStack.getPreview()}\n`;
        });
        return r;
    }
}
class Rod extends Item {
    constructor(id, name, rarity, description, recipe, maxWeight) {
        super(id, name, rarity, description, recipe);
        this.maxWeight = maxWeight;
    }
    getType() {
        return `Fishing rod`;
    }
    getInfo() {
        var s = super.getInfo();
        s += `**Maximum fish weight:** ${this.maxWeight}\n`;
        return s;
    }
}
class ItemStack {
    constructor(item, quantity) {
        this.item = item;
        this.quantity = quantity;
    }
    getInfo() {
        return `${this.quantity}x :${this.item.getInfo()}`;
    }
    getPreview() {
        return `${this.quantity}x **${this.item.name}**(id:${this.item.id})`;
    }
    toString() {
        return `${this.item.id}:${this.quantity}`;
    }
    static fromString(string, game) {
        var args = string.split(':');
        var item = game.getItem(parseInt(args[0]));
        var quantity = parseInt(args[1]);
        return new ItemStack(item, quantity);
    }
}
class Equipment {
    constructor(itemStacks, worstRod) {
        this.worstRod = worstRod;
        this.currentRod = worstRod;
        this.itemStacks = itemStacks;
    }
    getPreview() {
        if (this.itemStacks.length > 0) {
            var s = ``;
            if (this.currentRod != null && this.currentRod != undefined) {
                s += `Equipped fishing rod: \n${this.currentRod.getInfo()}`;
            }
            s += "\nOverall you have:\n";
            this.itemStacks.forEach(element => {
                s += `${element.getPreview()}\n`;
            });
            return s;
        }
        else {
            return `You have nothing in your equipment :(`;
        }
    }
    addItemStack(drop) {
        var newOne = true;
        this.itemStacks.some(itemStack => {
            if (itemStack.item.name == drop.item.name) {
                itemStack.quantity += drop.quantity;
                newOne = false;
                return true;
            }
        });
        if (newOne) {
            this.itemStacks.push(drop);
        }
    }
    craft(item) {
        item.recipe.forEach(recipeStack => {
            var stack = this.itemStacks.find(s => {
                return recipeStack.item.id == s.item.id;
            });
            stack.quantity -= recipeStack.quantity;
        });
        this.addItemStack(new ItemStack(item, 1));
    }
    recipeRequirements(recipe) {
        var result;
        result = [];
        recipe.forEach(recipeStack => {
            var stack = this.itemStacks.find(s => {
                return recipeStack.item.id == s.item.id;
            });
            var neededQuantity = recipeStack.quantity;
            if (stack != undefined) {
                neededQuantity -= stack.quantity;
            }
            if (neededQuantity > 0) {
                result.push(new ItemStack(recipeStack.item, neededQuantity));
            }
        });
        return result;
    }
    use(item) {
        if (item == null) {
            return `This item doesn't exist`;
        }
        var stack = this.itemStacks.find(e => {
            return e.item.id == item.id;
        });
        if (stack != null) {
            if (stack.quantity > 0) {
                if (stack.item instanceof Rod) {
                    this.currentRod = stack.item;
                    return null;
                }
                else {
                    return `This item is not usable!`;
                }
            }
            else {
                return `You don't have this item!`;
            }
        }
        else {
            return `You don't have this item!`;
        }
    }
    break(item) {
        var stack = this.itemStacks.find(e => {
            return e.item.id == item.id;
        });
        stack.quantity--;
        if (stack.quantity = 0) {
            if (stack.item instanceof Rod) {
                this.currentRod = this.worstRod;
            }
        }
    }
    toString() {
        var s;
        s = ``;
        this.itemStacks.forEach(i => {
            s += `${i.toString()};`;
        });
        return s.substring(0, s.length - 1);
    }
    static fromString(string, game) {
        if (string == null)
            return new Equipment([], game.getItem(ItemEnum.woodenStick));
        var stacks;
        stacks = [];
        var args = string.split(';');
        args.forEach(arg => {
            var stack = ItemStack.fromString(arg, game);
            if (stack.item != undefined) {
                stacks.push(ItemStack.fromString(arg, game));
            }
        });
        return new Equipment(stacks, game.getItem(ItemEnum.woodenStick));
    }
}
var ItemEnum;
(function (ItemEnum) {
    ItemEnum[ItemEnum["sharkTooth"] = 0] = "sharkTooth";
    ItemEnum[ItemEnum["leatherStrips"] = 1] = "leatherStrips";
    ItemEnum[ItemEnum["ironStick"] = 2] = "ironStick";
    ItemEnum[ItemEnum["strongBranch"] = 3] = "strongBranch";
    ItemEnum[ItemEnum["ironStrips"] = 4] = "ironStrips";
    ItemEnum[ItemEnum["woodenStick"] = 5] = "woodenStick";
    ItemEnum[ItemEnum["woodFishingPole"] = 6] = "woodFishingPole";
    ItemEnum[ItemEnum["reinforcedFishingPole"] = 7] = "reinforcedFishingPole";
    ItemEnum[ItemEnum["ironFishingPole"] = 8] = "ironFishingPole";
    ItemEnum[ItemEnum["shortString"] = 9] = "shortString";
    ItemEnum[ItemEnum["longString"] = 10] = "longString";
    ItemEnum[ItemEnum["splinterOfWood"] = 11] = "splinterOfWood";
    ItemEnum[ItemEnum["needle"] = 12] = "needle";
    ItemEnum[ItemEnum["pieceOfFiber"] = 13] = "pieceOfFiber";
})(ItemEnum || (ItemEnum = {}));
//# sourceMappingURL=game.js.map