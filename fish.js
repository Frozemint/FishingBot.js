const mc = require('minecraft-protocol');
const fs = require('fs');
const events = require('events');

var fishingRodEntityId = 0;
var activeHotbarSlot = 0; //offset 
var startCheck = false;
var userEntityId = -1;
var hotItemSlot = -1;
var playerInventory = [];
var lastCatchTime = -1;
var cumCatch = 0;
var noFishingRod = false;
var elapsedTime = 0;
var checkFishTimer; 


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

process.on('SIGINT', function() {
    console.log("Caught ^C:");
    process.exit();
});

var passwordFile = fs.readFileSync('password.json');
passwordFile = JSON.parse(passwordFile);

var client = mc.createClient({
  host: "ubc.mcpro.io",   // optional
  // host: "192.168.1.76",
  port: 25565,         // optional
  username: "nami5504@gmail.com",
  // username: "Test1"//,
  password: passwordFile.password
});

console.log('Starting bot...');

function idToHumanName(ID){
  switch(ID){
    case 225:
      return 'Lily Pad';
    case 238:
      return 'Tripwire Hook';
    case 525:
      return 'Bow';
    case 545:
      return 'Stick';
    case 552:
      return 'String';
    case 546:
      return 'Bowl';
    case 566:
      return 'Leather Boots';
    case 599:
      return 'Saddle';
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
    case 798:
      return 'Name Tag';
    case 780:
      return 'Enchanted Book';
    case 855:
      return 'Nautilus Shell'
    default:
      return ID;
  }

}

client.on('login', function(packet){
  userEntityId = packet.entityId;
  console.log('Logged in with entity ID: ' + userEntityId);
  client.write('held_item_slot', {slotId: 0});
  activeHotbarSlot = 0;
  setTimeout(function(){
        console.log('Casting line again...');
        retryEquipFishingRod();
      } , 5 * 1000 );
});

client.on('chat', function(packet){
  // console.log(packet);
  // var textArray = JSON.parse(packet.message);
  // console.log('Chat - <' + textArray.with[0].text + '> ' + textArray.with[1]);
});

client.on('disconnect', function(packet){
  console.log(packet);
});

client.on('kick_disconnect', function(packet){
  console.log('Kicked from server. Reason: ');
  console.log(packet);
});

client.on('window_items', function(packet){
  // console.log('Updating player inventory...');
  // console.log(tempB);
  playerInventory = packet.items;

});

client.on('set_slot', function(packet){
  if (packet.windowId != 0 || playerInventory.length === 0 || cumCatch === 0) {return;} //update is not about player inv
  if (packet.item.itemId && packet.slot != PLAYER_HOTBARSLOT_OFFSET + activeHotbarSlot){
    console.log('Caught a ' + idToHumanName(packet.item.itemId) + '. Mean time for catch (sec): ' + (process.uptime() / cumCatch).toFixed(2));
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
  // console.log(packet);
  if (packet.entityId === fishingRodEntityId){
    if (Math.abs(packet.velocityY) > 1000){
      //catch fish
      // console.log(packet);
      // console.log('Threshold breached - Reeling line');
      client.write('use_item', {hand: 0});
      cumCatch++;
      startCheck = false;
      clearInterval(checkFishTimer);
      setTimeout(function(){
        // console.log('Casting line again...');
        retryEquipFishingRod();
      } , 1 * 1000 );
    }
  }
});

client.on('spawn_entity', function(packet){
  if (packet.type === 102){
    // console.log('Fishing line cast.');
    fishingRodEntityId = packet.entityId;
    setTimeout(function(){ 
      startCheck = true;
    }, 1000);
  }
});

client.on('entity_destroy', function(packet){
  if (noFishingRod || !startCheck) { return; }
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
      noFishingRod = false;
      elapsedTime = 0;
      // checkFishTimer = setInterval(function() {
      //   // console.log(elapsedTime);
      //   elapsedTime = elapsedTime + 2;
      //   if (elapsedTime > 60){
      //     console.log('No catch for 60s, possibly stuck. Recasting line.');
      //     startCheck = false;
      //     clearInterval(checkFishTimer);
      //     retryEquipFishingRod();
      //   }
      // }, 2 * 1000);
      return;
    }
  }
  noFishingRod = true;
  setTimeout((function() {
    console.warn(' ---------------- ');
    console.warn('Did not find fishing rod. Idling.');
    // return process.exit(0);
}), 2 * 1000);
}
