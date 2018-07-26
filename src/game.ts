import * as DISCORD from "discord.js";
import * as sql from "sqlite3";

class FishGame {
    client: DISCORD.Client;
    playersDataTableName: string;
    players: Player[];
    maxRestBonus: number;
    database: sql.Database;

    rodData: Rod[];
    fishGroupData: FishGroup[];
    materialData: Item[];

    constructor(client: DISCORD.Client) {
        this.client = client;
        this.playersDataTableName = "scores";
        this.players = [];
        this.initDatabase();
        this.maxRestBonus = 1000 * 10 ;
        this.loadData();
        process.on('exit', () => {
            this.database.close();
            console.log('Closed!');
        });
    }

    loadData() {
        this.materialData = [
            new Item(ItemEnum.sharkTooth,"Shark's tooth", Rarity.Rare, "Sharpy one", []), 
            new Item(ItemEnum.leatherStrips,"Leather strips", Rarity.Uncommon, "TODO", []), 
            new Item(ItemEnum.ironStick,"Iron stick", Rarity.Rare, "TODO", []), 
            new Item(ItemEnum.strongBranch,"Strong branch", Rarity.Common, "TODO", []), 
            new Item(ItemEnum.ironStrips,"Iron strips", Rarity.Uncommon, "TODO", []), 
            new Item(ItemEnum.shortString,"Short String", Rarity.Common, "TODO", []), 
        ]
        this.materialData.push(new Rod(ItemEnum.woodenStick, "Wooden Stick", Rarity.Worthless, "Solid wooden stick you found nearby", 2, []));
        this.materialData.push(new Rod(ItemEnum.woodFishingPole,"Wood Fishing Pole", Rarity.Common, "A couple of pieces joined together to resemble a fishing rod", [
            new ItemStack(this.getItem(ItemEnum.strongBranch), 1)
        ], 5),);
        this.materialData.push(new Rod(ItemEnum.reinforcedFishingPole, "Reinforced Fishing Pole", Rarity.Uncommon,  "Hard and tough fishing pole.", [
            new ItemStack(this.getItem(ItemEnum.ironStrips), 1)
        ], 15),);
        this.materialData.push(new Rod(ItemEnum.ironFishingPole, "Iron Fishing Rod", Rarity.Rare, "TODO", [
            new ItemStack(this.getItem(ItemEnum.ironStick), 1)
        ], 40));
        this.fishGroupData = [
            new FishGroup(Rarity.Worthless, 60, [
                new Fish("Piece of wood", 2, 0, []),
                new Fish("Coca-cola can", 2, 0, []),
                new Fish("Dirty glove", 2, 0, []),
                new Fish("Smelly sock", 2, 0, []),
                new Fish("Empty wallet", 2, 0, [])
            ]),
            new FishGroup(Rarity.Common, 40, [
                new Fish("Yellowfin Sculpin", 1.7, 1, []),
                new Fish("Whiting", 1.7, 2, []),
                new Fish("Tongue Sole", 1.4, 5, []),
                new Fish("Surfperch", 0.8, 7, []),
                new Fish("Striped Catfish", 2.5, 9, []),
                new Fish("Garbage Bag", 5, 0, [
                    new ItemStack(this.getItem(ItemEnum.strongBranch), 1),
                    new ItemStack(this.getItem(ItemEnum.shortString), 1),
                ])
            ]),
            new FishGroup(Rarity.Uncommon, 20, [
                new Fish("Brook Trout", 4.4, 11, []),
                new Fish("Barbel", 9, 16, []),
                new Fish("Sole", 0.4, 17, []),
                new Fish("Rockfish", 31, 22, []),
                new Fish("Bass", 5.5, 29, []),
                new Fish("Small wooden box", 1.5, 0, [

                ])
            ]),
            new FishGroup(Rarity.Rare, 10, [
                new Fish("Shark", 50, 45, [
                    new ItemStack(this.getItem(ItemEnum.sharkTooth), 1)
                ]),
                new Fish("Gold nugget", 0.2, 60, []),
            ]),
            new FishGroup(Rarity.Epic, 100000, [
                new Fish("Mysterious chest", 10, 100, [
                    new ItemStack(this.getItem(ItemEnum.ironStick), 1)
                ])
            ])
        ];
        this.fishGroupData.forEach(fishGroup => {
            fishGroup.fishes.forEach(fish => {
                fish.rarity = fishGroup.rarity;
            })
        })
    }

    initDatabase() {
        this.database = new sql.Database(`./players.sqlite`);
        this.database.run(`CREATE TABLE IF NOT EXISTS ${this.playersDataTableName} (userId TEXT, gold INTEGER, lastMessageTime INTEGER, equipment STRING)`);
        //this.database.run(`ALTER TABLE ${this.playersDataTableName} ADD COLUMN equipment STRING`);
        this.database.all(`SELECT * FROM ${this.playersDataTableName}`, (err, rows) => {
            rows.forEach(row => {
                if(row.userId != null) {
                    var p = this.players.find(player => {
                        return player.userId == row.userId;
                    });
                    if(p == undefined) {
                        this.players.push(new Player(row.userId, row.gold, row.lastMessageTime, Equipment.fromString(row.equipment, this)));
                    }
                }
            })
        });
        setInterval(() => {
            this.updateDatabase();
        }, 20000);
    }

    updateDatabase() {
        this.players.forEach(player => {
            this.database.get(`SELECT * FROM ${this.playersDataTableName} WHERE userId = "${player.userId}"`, (err, row) => {
                if(!row) {
                    this.database.run(`INSERT INTO ${this.playersDataTableName} (userId, gold, lastMessageTime) VALUES (?, ?, ?)`, [player.userId, player.gold, player.lastMessageTime]);
                }
                else {
                    this.database.run(`UPDATE ${this.playersDataTableName} SET gold = ${player.gold}, lastMessageTime = ${player.lastMessageTime}  WHERE userId = "${player.userId}"`);
                }
            })
        });
    }

    receiveMessage(message : DISCORD.Message) {
        if(message.content.startsWith("!fish")) {
            this.messageFish(message);
        }
        if(message.content.startsWith("!update")) {
            message.channel.send("Updating database..");
            this.updateDatabase();
            message.channel.send("Database updated!");
        }
        else if(message.content.startsWith("!give")) {
            this.messageGive(message)
        }
        else if(message.content.startsWith("!top")) {
            this.messageLeaderboard(message);
        }
        else if(message.content.startsWith("!scout")) {
            this.messageScout(message);
        }
        else if(message.content.startsWith("!take") && message.author.id == "150994488515362817") {
            this.messageTake(message);
        }
        else if(message.content.startsWith("!eq") || message.content.startsWith("!equipment")) {
            this.messageEquipment(message);
        }
        else if(message.content.startsWith("!wizardry") && message.author.id == "150994488515362817") {
            var player = this.getPlayer("150994488515362817");
        }
    }

    messageGive(message) {
        if(message.mentions.members.size > 0) {
            var receiver = message.mentions.members.array()[0];
            var amount = parseInt(this.getMessageValue(message));
            if(amount > 0) {
                var p1 = this.getPlayer(message.author.id);
                var p2 = this.getPlayer(receiver.id);
                if(p1.gold < amount) {
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
        var loot : ItemStack;
        if(fish.drop.length > 0) {
            loot = fish.drop[Math.floor(Math.random()*fish.drop.length)];
        }
        var totalValue = player.gold + fish.value;
        player.gold = totalValue;
        var msg = `${this.getUser(player.userId)}, you've catched:\n${fish.getInfo()}`;
        if(loot != undefined) {
            msg += `You acquired a new item!\n${loot.item.getInfo()}`;
            player.equipment.addItemStack(loot);
        }
        msg += `You now have **${player.gold}** gold!`;
        message.channel.send(msg);
    }

    messageLeaderboard(message) {
        this.players.sort((a, b) => {
            return b.gold - a.gold;
        });
        var msg = `Leaderboard:\n`;
        for(var i = 0; i < 5; i++) {
            var player = this.players[i];
            var user = this.client.users.find(u => {
                return u.id == player.userId;
            })
            msg += `${i + 1}. ${user.username} - ${player.gold} gold\n`;
        }
        message.channel.send(msg);
    }

    messageScout(message) {
        var scouted = message.mentions.members.array()[0];
        var player = this.getPlayer(scouted.id);
        var a = '';
        if(scouted.displayName=="-Filow-") {
            a += " does not invite people to play lol with him and"
        }
        message.channel.send(`${scouted.displayName}${a} has ${player.gold} gold.`);
    }

    messageTake(message) {
        var punished = message.mentions.members.array()[0];
        var player = this.getPlayer(punished.id);
        var amount = parseInt(this.getMessageValue(message));
        player.gold -= amount;
        message.channel.send(`${punished} has been punished and lost ${amount} gold!`);
    }

    messageEquipment(message : DISCORD.Message) {
        var player = this.getPlayer(message.author.id);
        var msg = player.equipment.getPreview();
        message.channel.send(msg);
    }

    getMessageValue(message: DISCORD.Message) {
        var args = message.content.split(/[ ]+/);
        return args[2];
    }

    getUser(id) : DISCORD.User  {
        return this.client.users.find(u => {
            return u.id == id;
        })
    }

    getPlayer(id) : Player {
        var p;
        p = this.players.find(player => {
            return player.userId == id;
        })
        if(p == undefined) {
            p = new Player(id, 0, Date.now(), new Equipment([]));
            this.players.push(p);
        }
        return p;
    }

    magicalPower(deltaTime) {
        if(deltaTime > this.maxRestBonus) {
            deltaTime = this.maxRestBonus;
        }
        return 10 - (deltaTime/this.maxRestBonus)*9;
    }

    catchAFish(magicalPower): Fish {
        var fish = this.rollFishGroup(magicalPower).getRandomFish();
        return fish;
    }

    rollFishGroup(magicalPower): FishGroup {
        var sum = 0;
        this.fishGroupData.forEach(fishGroup => {
            fishGroup.tempProbability = Math.pow(fishGroup.probability, magicalPower);
            sum += fishGroup.tempProbability;
        })
        var roll = Math.random()*sum;
        var sum2 = 0;
        var result;
        this.fishGroupData.some(fishGroup => {
            if(sum2 + fishGroup.tempProbability > roll) {
                result = fishGroup;
                return true;
            }
            sum2 += fishGroup.tempProbability
        })
        return result;
    }

    getItem(item : ItemEnum) : Item {
        return this.materialData.find(i => {
            return i.id == item;
        })
    }
}

module.exports = FishGame;

enum Rarity {
    Worthless = "Worthless",
    Common = "Common",
    Uncommon = "Uncommon",
    Rare = "Rare",
    Epic = "Epic",
    Myhical = "Mythical",
    Legendary = "Legendary"
}

class Fish {
    name: string;
    mass: number;
    value: number;
    rarity: Rarity;
    drop : ItemStack[];
    constructor(name, mass, value, drop : ItemStack[]) {
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
    probability: number;
    fishes: Fish[];
    tempProbability: number;
    rarity: Rarity;
    constructor(rarity, probability, fishes) {
        this.rarity = rarity;
        this.probability = probability;
        this.fishes = fishes;
        this.tempProbability;
    }

    getRandomFish() {
        return this.fishes[Math.floor(Math.random()*this.fishes.length)];
    }
}

class Player {
    userId: string;
    gold: number;
    lastMessageTime: number;
    equipment : Equipment;
    constructor(userId, gold, lastMessageTime, equipment) {
        this.userId = userId,
        this.gold = gold,
        this.lastMessageTime = lastMessageTime;
        this.equipment = equipment;
    }
}

class Item {
    id : ItemEnum;
    description: any;
    rarity: Rarity;
    name: any;
    recipe : ItemStack[];
    constructor(id, name, rarity, description, recipe : ItemStack[]) {
        this.id = id;
        this.name = name;
        this.rarity = rarity;
        this.description = description;
        this.recipe = recipe;
    }

    getInfo() {
        return `**${this.name}**\n**Rarity:** ${this.rarity}\n**Description:**_${this.description}_\n`;
    }
}

class Rod extends Item {
    maxWeight: any;
    constructor(id, name, rarity, description, recipe, maxWeight) {
        super(id, name, rarity, description, recipe);
        this.maxWeight = maxWeight;
    }
}

class ItemStack {
    item: Item;
    quantity: number;

    constructor(item, quantity) {
        this.item = item;
        this.quantity = quantity;
    }

    getInfo() {
        return `${this.quantity}x :${this.item.getInfo()}`
    }

    toString() {
        return `${this.item.name}:${this.quantity}`;
    }

    static fromString(string : string, game : FishGame) {
        var args = string.split(':');
        var item = game.getItem(parseInt(args[0]));
        var quantity = parseInt(args[1]);
        return new ItemStack(item, quantity);
    }
}

class Equipment {

    itemStacks: ItemStack[];
    currentRod: Rod;

    constructor(itemStacks) {
        this.itemStacks = itemStacks;
    }

    getPreview() {
        if(this.itemStacks.length > 0) {
            var s = "You have:\n";
            this.itemStacks.forEach(element => {
                s += `${element.quantity}x ${element.item.name}\n`;
            });
            return s;
        }
        else {
            return `You have nothing in your equipment :(`;
        }
    }

    addItemStack(drop : ItemStack) {
        var newOne = true;
        this.itemStacks.some(itemStack => {
            if(itemStack.item.name == drop.item.name) {
                itemStack.quantity += drop.quantity;
                newOne = false;
                return true;
            }
        })
        if(newOne) {
            this.itemStacks.push(drop);
        }
    }

    toString() {
        var s : string;
        this.itemStacks.forEach(i => {
            s += `${i.toString()};`
        })
        return s.substring(0, s.length - 1);
    }

    static fromString(string : string, game : FishGame) : Equipment {
        if(string == null)
            return new Equipment([]);
        var stacks: ItemStack[];
        stacks = [];
        var args = string.split(';');
        args.forEach(arg => {
            stacks.push(ItemStack.fromString(arg, game));
        })
        return new Equipment(stacks);
    }
}

enum ItemEnum {
    sharkTooth,
    leatherStrips,
    ironStick,
    strongBranch,
    ironStrips,
    woodenStick,
    woodFishingPole,
    reinforcedFishingPole,
    ironFishingPole,
    shortString
}
