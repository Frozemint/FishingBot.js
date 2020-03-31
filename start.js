var mc = require('minecraft-protocol');
const fs = require('fs');

var fishingRodEntityId = 0;
var activeHotbarSlot = 0; //offset 
var startCheck = false;
var userEntityId = -1;
var hotItemSlot = -1;
var playerInventory = [];
var lastCatchTime = -1;
var cumCatch = 0;

const PLAYER_HOTBARSLOT_OFFSET = 36;

console.logCopy = console.log.bind(console);
console.warnCopy = console.warn.bind(console);

console.log = function(data)
{
    var currentDate = '[' + new Date().toLocaleString() + '] :';
    this.logCopy(currentDate, data);
};

console.warn = function(data)
{
    var currentDate = '[' + new Date().toLocaleString() + '] : [WARNING] -';
    this.warnCopy(currentDate, data);
};

var passwordFile = fs.readFileSync('password.json');
passwordFile = JSON.parse(passwordFile);

var client = mc.createClient({
  // host: "ubc.mcpro.io",   // optional
  host: "192.168.1.76",
  port: 25565,         // optional
  username: "nami5504@gmail.com",
  // username: "Test1",
  password: passwordFile.password
});

function idToHumanName(ID){
  switch(ID){
    case 238:
      return 'Tripwire Hook';
    case 545:
      return 'Stick';
    case 552:
      return 'String';
    case 546:
      return 'Bowl';
    case 603:
      return 'Leather';
    case 625:
      return 'Raw Cod';
    case 626:
      return 'Raw Salmon';
    case 627:
      return 'Tropical Fish';
    case 628:
      return 'Pufferfish';
    case 651:
      return 'Bone';
    case 681:
      return 'Rotten Flesh';
    case 687:
      return 'Potion';
    default:
      return ID;
  }

}


client.on('login', function(packet){
  userEntityId = packet.entityId;
  console.log('Logged in with entity ID: ' + userEntityId);
  client.write('held_item_slot', {slotId: 0});
  activeHotbarSlot = 0;
});

function comparer(otherArray){
  return function(current){
    return otherArray.filter(function(other){
      return other.itemId == current.itemId && other.itemCount == current.itemCount
    }).length == 0;
  }
}

function returnNewItem(old, newItems){
  if (old.length === 0){ return; }
  old = old.filter(x => { return x.present === true});
  newItems = newItems.filter(x => { return x.present === true});
  // console.log(old);
  // console.log(newItems);
  // old = old.filter(comparer(newItems));
  // newItems = newItems.filter(comparer(old));
  printNewItem(newItems);
  // var result = old.concat(newItems);
  
}

function printNewItem(newItem){
  if (!newItem[0]) {return;}
  // console.log('Caught a ' + newItem[0].itemId);
}

client.on('chat', function(packet){
  // console.log(packet);
  // var textArray = JSON.parse(packet.message);
  // console.log('Chat - <' + textArray.with[0].text + '> ' + textArray.with[1]);
});

client.on('window_items', function(packet){
  // console.log('Updating player inventory...');
  var tempA = playerInventory;
  var tempB = packet.items;
  tempB = tempB.filter(x => { return x.present === true});
  // console.log(tempB);
  // returnNewItem(tempA, tempB);
  playerInventory = packet.items;
  retryEquipFishingRod();
});

client.on('set_slot', function(packet){
  if (packet.windowId != 0 || playerInventory.length === 0 || cumCatch === 0) {return;} //update is not about player inv
  if (packet.item.itemId && packet.slot != PLAYER_HOTBARSLOT_OFFSET + activeHotbarSlot){
    console.log('Caught a ' + idToHumanName(packet.item.itemId) + '. Mean time for catch (sec): ' + process.uptime() / cumCatch);
  }
  hotItemSlot = packet.slot;
  if (packet.slot === PLAYER_HOTBARSLOT_OFFSET + activeHotbarSlot){
    if (!packet.item.present || packet.item.itemId != 622){
      startCheck = false;
    } 
  }
});

client.on('entity_velocity', function(packet){
  if (!startCheck) { return; }
  if (packet.entityId === fishingRodEntityId){
    if (Math.abs(packet.velocityY) > 390){
      //catch fish
      client.write('use_item', {hand: 0});
      cumCatch++;
      startCheck = false;
    }
  }
});

client.on('spawn_entity', function(packet){
  if (packet.type === 102){
    fishingRodEntityId = packet.entityId;
    setTimeout(function(){ 
      startCheck = true;
    }, 3000);
  }
});

client.on('entity_destroy', function(packet){
  if (packet.entityIds.indexOf(fishingRodEntityId) != -1){
    startCheck = false;
    console.log('Fishing rod entity destroyed! Restarting in 5 seconds...');
    setTimeout(function() {retryEquipFishingRod(); }, 5 * 1000);
  }
});

function retryEquipFishingRod(){
  for (var i = PLAYER_HOTBARSLOT_OFFSET; i < playerInventory.length; i++){
    if (playerInventory[i].present && playerInventory[i].itemId === 622){
      // console.log('Found and switched to another fishing rod at item slot ' + (i - PLAYER_HOTBARSLOT_OFFSET));
      activeHotbarSlot = i - PLAYER_HOTBARSLOT_OFFSET;
      client.write('held_item_slot', {slotId: (i - PLAYER_HOTBARSLOT_OFFSET)});
      client.write('use_item', {hand: 0});
      return;
    }
  }
  console.warn('Did not find fishing rod. Disconnecting in 60 seconds.');
  setTimeout((function() {
    return process.exit(0);
}), 60 * 1000);
}
