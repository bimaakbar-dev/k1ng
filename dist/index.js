var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/grammy/out/web.mjs
var filterQueryCache = /* @__PURE__ */ new Map();
function matchFilter(filter) {
  const queries = Array.isArray(filter) ? filter : [
    filter
  ];
  const key = queries.join(",");
  const predicate = filterQueryCache.get(key) ?? (() => {
    const parsed = parse(queries);
    const pred = compile(parsed);
    filterQueryCache.set(key, pred);
    return pred;
  })();
  return (ctx) => predicate(ctx);
}
__name(matchFilter, "matchFilter");
function parse(filter) {
  return Array.isArray(filter) ? filter.map((q) => q.split(":")) : [
    filter.split(":")
  ];
}
__name(parse, "parse");
function compile(parsed) {
  const preprocessed = parsed.flatMap((q) => check(q, preprocess(q)));
  const ltree = treeify(preprocessed);
  const predicate = arborist(ltree);
  return (ctx) => !!predicate(ctx.update, ctx);
}
__name(compile, "compile");
function preprocess(filter) {
  const valid = UPDATE_KEYS;
  const expanded = [
    filter
  ].flatMap((q) => {
    const [l1, l2, l3] = q;
    if (!(l1 in L1_SHORTCUTS)) return [
      q
    ];
    if (!l1 && !l2 && !l3) return [
      q
    ];
    const targets = L1_SHORTCUTS[l1];
    const expanded2 = targets.map((s2) => [
      s2,
      l2,
      l3
    ]);
    if (l2 === void 0) return expanded2;
    if (l2 in L2_SHORTCUTS && (l2 || l3)) return expanded2;
    return expanded2.filter(([s2]) => !!valid[s2]?.[l2]);
  }).flatMap((q) => {
    const [l1, l2, l3] = q;
    if (!(l2 in L2_SHORTCUTS)) return [
      q
    ];
    if (!l2 && !l3) return [
      q
    ];
    const targets = L2_SHORTCUTS[l2];
    const expanded2 = targets.map((s2) => [
      l1,
      s2,
      l3
    ]);
    if (l3 === void 0) return expanded2;
    return expanded2.filter(([, s2]) => !!valid[l1]?.[s2]?.[l3]);
  });
  if (expanded.length === 0) {
    throw new Error(`Shortcuts in '${filter.join(":")}' do not expand to any valid filter query`);
  }
  return expanded;
}
__name(preprocess, "preprocess");
function check(original, preprocessed) {
  if (preprocessed.length === 0) throw new Error("Empty filter query given");
  const errors = preprocessed.map(checkOne).filter((r) => r !== true);
  if (errors.length === 0) return preprocessed;
  else if (errors.length === 1) throw new Error(errors[0]);
  else {
    throw new Error(`Invalid filter query '${original.join(":")}'. There are ${errors.length} errors after expanding the contained shortcuts: ${errors.join("; ")}`);
  }
}
__name(check, "check");
function checkOne(filter) {
  const [l1, l2, l3, ...n] = filter;
  if (l1 === void 0) return "Empty filter query given";
  if (!(l1 in UPDATE_KEYS)) {
    const permitted = Object.keys(UPDATE_KEYS);
    return `Invalid L1 filter '${l1}' given in '${filter.join(":")}'. Permitted values are: ${permitted.map((k) => `'${k}'`).join(", ")}.`;
  }
  if (l2 === void 0) return true;
  const l1Obj = UPDATE_KEYS[l1];
  if (!(l2 in l1Obj)) {
    const permitted = Object.keys(l1Obj);
    return `Invalid L2 filter '${l2}' given in '${filter.join(":")}'. Permitted values are: ${permitted.map((k) => `'${k}'`).join(", ")}.`;
  }
  if (l3 === void 0) return true;
  const l2Obj = l1Obj[l2];
  if (!(l3 in l2Obj)) {
    const permitted = Object.keys(l2Obj);
    return `Invalid L3 filter '${l3}' given in '${filter.join(":")}'. ${permitted.length === 0 ? `No further filtering is possible after '${l1}:${l2}'.` : `Permitted values are: ${permitted.map((k) => `'${k}'`).join(", ")}.`}`;
  }
  if (n.length === 0) return true;
  return `Cannot filter further than three levels, ':${n.join(":")}' is invalid!`;
}
__name(checkOne, "checkOne");
function treeify(paths) {
  const tree = {};
  for (const [l1, l2, l3] of paths) {
    const subtree = tree[l1] ??= {};
    if (l2 !== void 0) {
      const set = subtree[l2] ??= /* @__PURE__ */ new Set();
      if (l3 !== void 0) set.add(l3);
    }
  }
  return tree;
}
__name(treeify, "treeify");
function or(left, right) {
  return (obj, ctx) => left(obj, ctx) || right(obj, ctx);
}
__name(or, "or");
function concat(get, test) {
  return (obj, ctx) => {
    const nextObj = get(obj, ctx);
    return nextObj && test(nextObj, ctx);
  };
}
__name(concat, "concat");
function leaf(pred) {
  return (obj, ctx) => pred(obj, ctx) != null;
}
__name(leaf, "leaf");
function arborist(tree) {
  const l1Predicates = Object.entries(tree).map(([l1, subtree]) => {
    const l1Pred = /* @__PURE__ */ __name((obj) => obj[l1], "l1Pred");
    const l2Predicates = Object.entries(subtree).map(([l2, set]) => {
      const l2Pred = /* @__PURE__ */ __name((obj) => obj[l2], "l2Pred");
      const l3Predicates = Array.from(set).map((l3) => {
        const l3Pred = l3 === "me" ? (obj, ctx) => {
          const me = ctx.me.id;
          return testMaybeArray(obj, (u) => u.id === me);
        } : (obj) => testMaybeArray(obj, (e) => e[l3] || e.type === l3);
        return l3Pred;
      });
      return l3Predicates.length === 0 ? leaf(l2Pred) : concat(l2Pred, l3Predicates.reduce(or));
    });
    return l2Predicates.length === 0 ? leaf(l1Pred) : concat(l1Pred, l2Predicates.reduce(or));
  });
  if (l1Predicates.length === 0) {
    throw new Error("Cannot create filter function for empty query");
  }
  return l1Predicates.reduce(or);
}
__name(arborist, "arborist");
function testMaybeArray(t, pred) {
  const p = /* @__PURE__ */ __name((x) => x != null && pred(x), "p");
  return Array.isArray(t) ? t.some(p) : p(t);
}
__name(testMaybeArray, "testMaybeArray");
var ENTITY_KEYS = {
  mention: {},
  hashtag: {},
  cashtag: {},
  bot_command: {},
  url: {},
  email: {},
  phone_number: {},
  bank_card_number: {},
  ton_address: {},
  bold: {},
  italic: {},
  underline: {},
  strikethrough: {},
  spoiler: {},
  blockquote: {},
  expandable_blockquote: {},
  code: {},
  pre: {},
  text_link: {},
  text_mention: {},
  custom_emoji: {},
  date_time: {}
};
var USER_KEYS = {
  me: {},
  is_bot: {},
  is_premium: {},
  added_to_attachment_menu: {}
};
var FORWARD_ORIGIN_KEYS = {
  user: {},
  hidden_user: {},
  chat: {},
  channel: {}
};
var STICKER_KEYS = {
  is_video: {},
  is_animated: {},
  premium_animation: {}
};
var REACTION_KEYS = {
  emoji: {},
  custom_emoji: {},
  paid: {}
};
var GIFT_INFO_KEYS = {
  can_be_upgraded: {},
  is_upgrade_separate: {},
  is_private: {}
};
var WIDGET_KEYS = {
  id: {},
  public_data: {},
  chat_data: {}
};
var COMMON_MESSAGE_KEYS = {
  forward_origin: FORWARD_ORIGIN_KEYS,
  is_topic_message: {},
  is_automatic_forward: {},
  guest_query_id: {},
  business_connection_id: {},
  text: {},
  rich_message: {},
  animation: {},
  audio: {},
  document: {},
  live_photo: {},
  paid_media: {},
  photo: {},
  sticker: STICKER_KEYS,
  story: {},
  video: {},
  video_note: {},
  voice: {},
  widget: WIDGET_KEYS,
  contact: {},
  dice: {},
  game: {},
  poll: {},
  venue: {},
  location: {},
  entities: ENTITY_KEYS,
  caption_entities: ENTITY_KEYS,
  caption: {},
  link_preview_options: {
    url: {},
    prefer_small_media: {},
    prefer_large_media: {},
    show_above_text: {}
  },
  effect_id: {},
  paid_star_count: {},
  has_media_spoiler: {},
  new_chat_title: {},
  new_chat_photo: {},
  delete_chat_photo: {},
  message_auto_delete_timer_changed: {},
  pinned_message: {},
  invoice: {},
  proximity_alert_triggered: {},
  chat_background_set: {},
  giveaway_created: {},
  giveaway: {
    only_new_members: {},
    has_public_winners: {}
  },
  giveaway_winners: {
    only_new_members: {},
    was_refunded: {}
  },
  giveaway_completed: {},
  ton_wallet_transfer: {},
  gift: GIFT_INFO_KEYS,
  gift_upgrade_sent: GIFT_INFO_KEYS,
  unique_gift: {
    transfer_star_count: {},
    text: {},
    is_private: {}
  },
  paid_message_price_changed: {},
  paid_messages_waived: {},
  video_chat_scheduled: {},
  video_chat_started: {},
  video_chat_ended: {},
  video_chat_participants_invited: {},
  web_app_data: {}
};
var MESSAGE_KEYS = {
  ...COMMON_MESSAGE_KEYS,
  direct_messages_topic: {},
  chat_owner_left: {
    new_owner: {}
  },
  chat_owner_changed: {},
  new_chat_members: USER_KEYS,
  community_chat_joined: {},
  left_chat_member: USER_KEYS,
  group_chat_created: {},
  supergroup_chat_created: {},
  migrate_to_chat_id: {},
  migrate_from_chat_id: {},
  successful_payment: {},
  refunded_payment: {},
  users_shared: {},
  chat_shared: {},
  connected_website: {},
  managed_bot_created: {},
  write_access_allowed: {},
  passport_data: {},
  boost_added: {},
  forum_topic_created: {
    is_name_implicit: {}
  },
  forum_topic_edited: {
    name: {},
    icon_custom_emoji_id: {}
  },
  forum_topic_closed: {},
  forum_topic_reopened: {},
  general_forum_topic_hidden: {},
  general_forum_topic_unhidden: {},
  checklist: {
    others_can_add_tasks: {},
    others_can_mark_tasks_as_done: {}
  },
  checklist_tasks_done: {},
  checklist_tasks_added: {},
  community_chat_added: {},
  community_chat_removed: {},
  poll_option_added: {},
  poll_option_deleted: {},
  suggested_post_info: {},
  suggested_post_approved: {},
  suggested_post_approval_failed: {},
  suggested_post_declined: {},
  suggested_post_paid: {},
  suggested_post_refunded: {},
  sender_boost_count: {}
};
var CHANNEL_POST_KEYS = {
  ...COMMON_MESSAGE_KEYS,
  channel_chat_created: {},
  direct_message_price_changed: {},
  is_paid_post: {}
};
var BUSINESS_CONNECTION_KEYS = {
  can_reply: {},
  is_enabled: {}
};
var MESSAGE_REACTION_KEYS = {
  old_reaction: REACTION_KEYS,
  new_reaction: REACTION_KEYS
};
var MESSAGE_REACTION_COUNT_UPDATED_KEYS = {
  reactions: REACTION_KEYS
};
var CALLBACK_QUERY_KEYS = {
  data: {},
  game_short_name: {}
};
var WIDGET_QUERY_TYPE_KEYS = {
  data: {},
  sign_data: {},
  sent_transaction: {}
};
var WIDGET_QUERY_KEYS = {
  type: WIDGET_QUERY_TYPE_KEYS,
  widget_id: {}
};
var CHAT_MEMBER_UPDATED_KEYS = {
  from: USER_KEYS
};
var UPDATE_KEYS = {
  message: MESSAGE_KEYS,
  edited_message: MESSAGE_KEYS,
  channel_post: CHANNEL_POST_KEYS,
  edited_channel_post: CHANNEL_POST_KEYS,
  business_connection: BUSINESS_CONNECTION_KEYS,
  business_message: MESSAGE_KEYS,
  edited_business_message: MESSAGE_KEYS,
  deleted_business_messages: {},
  guest_message: MESSAGE_KEYS,
  stopped_message_generation: {},
  inline_query: {},
  chosen_inline_result: {},
  callback_query: CALLBACK_QUERY_KEYS,
  widget_query: WIDGET_QUERY_KEYS,
  shared_widget_query: {
    type: WIDGET_QUERY_TYPE_KEYS
  },
  shipping_query: {},
  pre_checkout_query: {},
  poll: {},
  poll_answer: {},
  my_chat_member: CHAT_MEMBER_UPDATED_KEYS,
  chat_member: CHAT_MEMBER_UPDATED_KEYS,
  managed_bot: {},
  chat_join_request: {},
  message_reaction: MESSAGE_REACTION_KEYS,
  message_reaction_count: MESSAGE_REACTION_COUNT_UPDATED_KEYS,
  chat_boost: {},
  removed_chat_boost: {},
  purchased_paid_media: {},
  subscription: {
    state: {
      canceled: {},
      active: {},
      failed: {}
    }
  }
};
var L1_SHORTCUTS = {
  "": [
    "message",
    "channel_post"
  ],
  msg: [
    "message",
    "channel_post"
  ],
  edit: [
    "edited_message",
    "edited_channel_post"
  ]
};
var L2_SHORTCUTS = {
  "": [
    "entities",
    "caption_entities"
  ],
  media: [
    "photo",
    "live_photo",
    "video"
  ],
  file: [
    "photo",
    "live_photo",
    "animation",
    "audio",
    "document",
    "video",
    "video_note",
    "voice",
    "sticker"
  ]
};
var checker = {
  filterQuery(filter) {
    const pred = matchFilter(filter);
    return (ctx) => pred(ctx);
  },
  text(trigger) {
    const hasText = checker.filterQuery([
      ":text",
      ":caption"
    ]);
    const trg = triggerFn(trigger);
    return (ctx) => {
      if (!hasText(ctx)) return false;
      const msg = ctx.message ?? ctx.channelPost;
      const txt = msg.text ?? msg.caption;
      return match(ctx, txt, trg);
    };
  },
  command(command) {
    const hasEntities = checker.filterQuery(":entities:bot_command");
    const atCommands = /* @__PURE__ */ new Set();
    const noAtCommands = /* @__PURE__ */ new Set();
    toArray(command).forEach((cmd) => {
      if (cmd.startsWith("/")) {
        throw new Error(`Do not include '/' when registering command handlers (use '${cmd.substring(1)}' not '${cmd}')`);
      }
      const set = cmd.includes("@") ? atCommands : noAtCommands;
      set.add(cmd);
    });
    return (ctx) => {
      if (!hasEntities(ctx)) return false;
      const msg = ctx.message ?? ctx.channelPost;
      const txt = msg.text ?? msg.caption;
      return msg.entities.some((e) => {
        if (e.type !== "bot_command") return false;
        if (e.offset !== 0) return false;
        const cmd = txt.substring(1, e.length);
        if (noAtCommands.has(cmd) || atCommands.has(cmd)) {
          ctx.match = txt.substring(cmd.length + 1).trimStart();
          return true;
        }
        const index = cmd.indexOf("@");
        if (index === -1) return false;
        const username = ctx.me.username?.toLowerCase();
        if (username === void 0) return false;
        const atTarget = cmd.substring(index + 1).toLowerCase();
        if (atTarget !== username) return false;
        const atCommand = cmd.substring(0, index);
        if (noAtCommands.has(atCommand)) {
          ctx.match = txt.substring(cmd.length + 1).trimStart();
          return true;
        }
        return false;
      });
    };
  },
  reaction(reaction) {
    const hasMessageReaction = checker.filterQuery("message_reaction");
    const normalized = typeof reaction === "string" ? [
      {
        type: "emoji",
        emoji: reaction
      }
    ] : (Array.isArray(reaction) ? reaction : [
      reaction
    ]).map((emoji2) => typeof emoji2 === "string" ? {
      type: "emoji",
      emoji: emoji2
    } : emoji2);
    const emoji = new Set(normalized.filter((r) => r.type === "emoji").map((r) => r.emoji));
    const customEmoji = new Set(normalized.filter((r) => r.type === "custom_emoji").map((r) => r.custom_emoji_id));
    const paid = normalized.some((r) => r.type === "paid");
    return (ctx) => {
      if (!hasMessageReaction(ctx)) return false;
      const { old_reaction, new_reaction } = ctx.messageReaction;
      for (const reaction2 of new_reaction) {
        let isOld = false;
        if (reaction2.type === "emoji") {
          for (const old of old_reaction) {
            if (old.type !== "emoji") continue;
            if (old.emoji === reaction2.emoji) {
              isOld = true;
              break;
            }
          }
        } else if (reaction2.type === "custom_emoji") {
          for (const old of old_reaction) {
            if (old.type !== "custom_emoji") continue;
            if (old.custom_emoji_id === reaction2.custom_emoji_id) {
              isOld = true;
              break;
            }
          }
        } else if (reaction2.type === "paid") {
          for (const old of old_reaction) {
            if (old.type !== "paid") continue;
            isOld = true;
            break;
          }
        } else {
        }
        if (isOld) continue;
        if (reaction2.type === "emoji") {
          if (emoji.has(reaction2.emoji)) return true;
        } else if (reaction2.type === "custom_emoji") {
          if (customEmoji.has(reaction2.custom_emoji_id)) return true;
        } else if (reaction2.type === "paid") {
          if (paid) return true;
        } else {
          return true;
        }
      }
      return false;
    };
  },
  chatType(chatType) {
    const set = new Set(toArray(chatType));
    return (ctx) => ctx.chat?.type !== void 0 && set.has(ctx.chat.type);
  },
  callbackQuery(trigger) {
    const hasCallbackQuery = checker.filterQuery("callback_query:data");
    const trg = triggerFn(trigger);
    return (ctx) => hasCallbackQuery(ctx) && match(ctx, ctx.callbackQuery.data, trg);
  },
  widgetQuery(trigger) {
    const hasWidgetQuery = checker.filterQuery("widget_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasWidgetQuery(ctx) && match(ctx, ctx.widgetQuery.data, trg);
  },
  sharedWidgetQuery(trigger) {
    const hasSharedWidgetQuery = checker.filterQuery("shared_widget_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasSharedWidgetQuery(ctx) && match(ctx, ctx.sharedWidgetQuery.data, trg);
  },
  gameQuery(trigger) {
    const hasGameQuery = checker.filterQuery("callback_query:game_short_name");
    const trg = triggerFn(trigger);
    return (ctx) => hasGameQuery(ctx) && match(ctx, ctx.callbackQuery.game_short_name, trg);
  },
  inlineQuery(trigger) {
    const hasInlineQuery = checker.filterQuery("inline_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasInlineQuery(ctx) && match(ctx, ctx.inlineQuery.query, trg);
  },
  chosenInlineResult(trigger) {
    const hasChosenInlineResult = checker.filterQuery("chosen_inline_result");
    const trg = triggerFn(trigger);
    return (ctx) => hasChosenInlineResult(ctx) && match(ctx, ctx.chosenInlineResult.result_id, trg);
  },
  preCheckoutQuery(trigger) {
    const hasPreCheckoutQuery = checker.filterQuery("pre_checkout_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasPreCheckoutQuery(ctx) && match(ctx, ctx.preCheckoutQuery.invoice_payload, trg);
  },
  shippingQuery(trigger) {
    const hasShippingQuery = checker.filterQuery("shipping_query");
    const trg = triggerFn(trigger);
    return (ctx) => hasShippingQuery(ctx) && match(ctx, ctx.shippingQuery.invoice_payload, trg);
  }
};
var Context = class _Context {
  static {
    __name(this, "Context");
  }
  update;
  api;
  me;
  match;
  constructor(update, api, me) {
    this.update = update;
    this.api = api;
    this.me = me;
  }
  get message() {
    return this.update.message;
  }
  get editedMessage() {
    return this.update.edited_message;
  }
  get channelPost() {
    return this.update.channel_post;
  }
  get editedChannelPost() {
    return this.update.edited_channel_post;
  }
  get businessConnection() {
    return this.update.business_connection;
  }
  get businessMessage() {
    return this.update.business_message;
  }
  get editedBusinessMessage() {
    return this.update.edited_business_message;
  }
  get deletedBusinessMessages() {
    return this.update.deleted_business_messages;
  }
  get guestMessage() {
    return this.update.guest_message;
  }
  get stoppedMessageGeneration() {
    return this.update.stopped_message_generation;
  }
  get messageReaction() {
    return this.update.message_reaction;
  }
  get messageReactionCount() {
    return this.update.message_reaction_count;
  }
  get inlineQuery() {
    return this.update.inline_query;
  }
  get chosenInlineResult() {
    return this.update.chosen_inline_result;
  }
  get callbackQuery() {
    return this.update.callback_query;
  }
  get widgetQuery() {
    return this.update.widget_query;
  }
  get sharedWidgetQuery() {
    return this.update.shared_widget_query;
  }
  get shippingQuery() {
    return this.update.shipping_query;
  }
  get preCheckoutQuery() {
    return this.update.pre_checkout_query;
  }
  get poll() {
    return this.update.poll;
  }
  get pollAnswer() {
    return this.update.poll_answer;
  }
  get myChatMember() {
    return this.update.my_chat_member;
  }
  get chatMember() {
    return this.update.chat_member;
  }
  get managedBot() {
    return this.update.managed_bot;
  }
  get chatJoinRequest() {
    return this.update.chat_join_request;
  }
  get chatBoost() {
    return this.update.chat_boost;
  }
  get removedChatBoost() {
    return this.update.removed_chat_boost;
  }
  get purchasedPaidMedia() {
    return this.update.purchased_paid_media;
  }
  get subscription() {
    return this.update.subscription;
  }
  get msg() {
    return this.message ?? this.editedMessage ?? this.channelPost ?? this.editedChannelPost ?? this.businessMessage ?? this.editedBusinessMessage ?? this.guestMessage ?? this.callbackQuery?.message;
  }
  get chat() {
    return (this.msg ?? this.widgetQuery ?? this.deletedBusinessMessages ?? this.stoppedMessageGeneration ?? this.messageReaction ?? this.messageReactionCount ?? this.myChatMember ?? this.chatMember ?? this.chatJoinRequest ?? this.chatBoost ?? this.removedChatBoost)?.chat;
  }
  get senderChat() {
    return this.msg?.sender_chat;
  }
  get from() {
    return (this.businessConnection ?? this.messageReaction ?? this.managedBot ?? (this.chatBoost?.boost ?? this.removedChatBoost)?.source ?? this.subscription)?.user ?? (this.callbackQuery ?? this.widgetQuery ?? this.sharedWidgetQuery ?? this.msg ?? this.inlineQuery ?? this.chosenInlineResult ?? this.shippingQuery ?? this.preCheckoutQuery ?? this.myChatMember ?? this.chatMember ?? this.chatJoinRequest ?? this.purchasedPaidMedia)?.from;
  }
  get msgId() {
    return this.msg?.message_id ?? this.widgetQuery?.message_id ?? this.messageReaction?.message_id ?? this.messageReactionCount?.message_id;
  }
  get chatId() {
    return this.chat?.id ?? this.businessConnection?.user_chat_id;
  }
  get inlineMessageId() {
    return this.callbackQuery?.inline_message_id ?? this.widgetQuery?.inline_message_id ?? this.chosenInlineResult?.inline_message_id;
  }
  get businessConnectionId() {
    return this.msg?.business_connection_id ?? this.businessConnection?.id ?? this.deletedBusinessMessages?.business_connection_id;
  }
  entities(types) {
    const message = this.msg;
    if (message === void 0) return [];
    const text = message.text ?? message.caption;
    if (text === void 0) return [];
    let entities = message.entities ?? message.caption_entities;
    if (entities === void 0) return [];
    if (types !== void 0) {
      const filters = new Set(toArray(types));
      entities = entities.filter((entity) => filters.has(entity.type));
    }
    return entities.map((entity) => ({
      ...entity,
      text: text.substring(entity.offset, entity.offset + entity.length)
    }));
  }
  reactions() {
    const emoji = [];
    const emojiAdded = [];
    const emojiKept = [];
    const emojiRemoved = [];
    const customEmoji = [];
    const customEmojiAdded = [];
    const customEmojiKept = [];
    const customEmojiRemoved = [];
    let paid = false;
    let paidAdded = false;
    const r = this.messageReaction;
    if (r !== void 0) {
      const { old_reaction, new_reaction } = r;
      for (const reaction of new_reaction) {
        if (reaction.type === "emoji") {
          emoji.push(reaction.emoji);
        } else if (reaction.type === "custom_emoji") {
          customEmoji.push(reaction.custom_emoji_id);
        } else if (reaction.type === "paid") {
          paid = paidAdded = true;
        }
      }
      for (const reaction of old_reaction) {
        if (reaction.type === "emoji") {
          emojiRemoved.push(reaction.emoji);
        } else if (reaction.type === "custom_emoji") {
          customEmojiRemoved.push(reaction.custom_emoji_id);
        } else if (reaction.type === "paid") {
          paidAdded = false;
        }
      }
      emojiAdded.push(...emoji);
      customEmojiAdded.push(...customEmoji);
      for (let i = 0; i < emojiRemoved.length; i++) {
        const len = emojiAdded.length;
        if (len === 0) break;
        const rem = emojiRemoved[i];
        for (let j = 0; j < len; j++) {
          if (rem === emojiAdded[j]) {
            emojiKept.push(rem);
            emojiRemoved.splice(i, 1);
            emojiAdded.splice(j, 1);
            i--;
            break;
          }
        }
      }
      for (let i = 0; i < customEmojiRemoved.length; i++) {
        const len = customEmojiAdded.length;
        if (len === 0) break;
        const rem = customEmojiRemoved[i];
        for (let j = 0; j < len; j++) {
          if (rem === customEmojiAdded[j]) {
            customEmojiKept.push(rem);
            customEmojiRemoved.splice(i, 1);
            customEmojiAdded.splice(j, 1);
            i--;
            break;
          }
        }
      }
    }
    return {
      emoji,
      emojiAdded,
      emojiKept,
      emojiRemoved,
      customEmoji,
      customEmojiAdded,
      customEmojiKept,
      customEmojiRemoved,
      paid,
      paidAdded
    };
  }
  static has = checker;
  has(filter) {
    return _Context.has.filterQuery(filter)(this);
  }
  hasText(trigger) {
    return _Context.has.text(trigger)(this);
  }
  hasCommand(command) {
    return _Context.has.command(command)(this);
  }
  hasReaction(reaction) {
    return _Context.has.reaction(reaction)(this);
  }
  hasChatType(chatType) {
    return _Context.has.chatType(chatType)(this);
  }
  hasCallbackQuery(trigger) {
    return _Context.has.callbackQuery(trigger)(this);
  }
  hasWidgetQuery(trigger) {
    return _Context.has.widgetQuery(trigger)(this);
  }
  hasSharedWidgetQuery(trigger) {
    return _Context.has.sharedWidgetQuery(trigger)(this);
  }
  hasGameQuery(trigger) {
    return _Context.has.gameQuery(trigger)(this);
  }
  hasInlineQuery(trigger) {
    return _Context.has.inlineQuery(trigger)(this);
  }
  hasChosenInlineResult(trigger) {
    return _Context.has.chosenInlineResult(trigger)(this);
  }
  hasPreCheckoutQuery(trigger) {
    return _Context.has.preCheckoutQuery(trigger)(this);
  }
  hasShippingQuery(trigger) {
    return _Context.has.shippingQuery(trigger)(this);
  }
  reply(text, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendMessageEphemeralForCallback(callbackQueryId, text, options, signal) : this.api.sendMessage(orThrow(this.chatId, "sendMessage"), text, options, signal);
  }
  replyWithRichMessage(rich_message, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendRichMessageEphemeralForCallback(callbackQueryId, rich_message, options, signal) : this.api.sendRichMessage(orThrow(this.chatId, "sendRichMessage"), rich_message, options, signal);
  }
  forwardMessage(chat_id, other, signal) {
    const msg = this.msg;
    return this.api.forwardMessage(chat_id, orThrow(this.chatId, "forwardMessage"), orThrow(this.msgId, "forwardMessage"), {
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  forwardMessages(chat_id, message_ids, other, signal) {
    const msg = this.msg;
    return this.api.forwardMessages(chat_id, orThrow(this.chatId, "forwardMessages"), message_ids, {
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  copyMessage(chat_id, other, signal) {
    const msg = this.msg;
    return this.api.copyMessage(chat_id, orThrow(this.chatId, "copyMessage"), orThrow(this.msgId, "copyMessage"), {
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  copyMessages(chat_id, message_ids, other, signal) {
    const msg = this.msg;
    return this.api.copyMessages(chat_id, orThrow(this.chatId, "copyMessages"), message_ids, {
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  replyWithPhoto(photo, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendPhotoEphemeralForCallback(callbackQueryId, photo, options, signal) : this.api.sendPhoto(orThrow(this.chatId, "sendPhoto"), photo, options, signal);
  }
  replyWithLivePhoto(live_photo, photo, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendLivePhotoEphemeralForCallback(callbackQueryId, live_photo, photo, options, signal) : this.api.sendLivePhoto(orThrow(this.chatId, "sendLivePhoto"), live_photo, photo, options, signal);
  }
  replyWithAudio(audio, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendAudioEphemeralForCallback(callbackQueryId, audio, options, signal) : this.api.sendAudio(orThrow(this.chatId, "sendAudio"), audio, options, signal);
  }
  replyWithDocument(document1, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendDocumentEphemeralForCallback(callbackQueryId, document1, options, signal) : this.api.sendDocument(orThrow(this.chatId, "sendDocument"), document1, options, signal);
  }
  replyWithVideo(video, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendVideoEphemeralForCallback(callbackQueryId, video, options, signal) : this.api.sendVideo(orThrow(this.chatId, "sendVideo"), video, options, signal);
  }
  replyWithAnimation(animation, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendAnimationEphemeralForCallback(callbackQueryId, animation, options, signal) : this.api.sendAnimation(orThrow(this.chatId, "sendAnimation"), animation, options, signal);
  }
  replyWithVoice(voice, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendVoiceEphemeralForCallback(callbackQueryId, voice, options, signal) : this.api.sendVoice(orThrow(this.chatId, "sendVoice"), voice, options, signal);
  }
  replyWithVideoNote(video_note, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendVideoNoteEphemeralForCallback(callbackQueryId, video_note, options, signal) : this.api.sendVideoNote(orThrow(this.chatId, "sendVideoNote"), video_note, options, signal);
  }
  replyWithWidget(html, other, signal) {
    const msg = this.msg;
    return this.api.sendWidget(orThrow(this.chatId, "sendWidget"), html, {
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      ...other
    }, signal);
  }
  replyWithSharedWidget(widget_id, other, signal) {
    const msg = this.msg;
    return this.api.sendSharedWidget(orThrow(this.chatId, "sendSharedWidget"), widget_id, {
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      ...other
    }, signal);
  }
  sendPaidMedia(...args) {
    return this.replyWithPaidMedia(...args);
  }
  replyWithPaidMedia(star_count, media, other, signal) {
    const msg = this.msg;
    return this.api.sendPaidMedia(orThrow(this.chatId, "sendPaidMedia"), star_count, media, {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: this.msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  replyWithMediaGroup(media, other, signal) {
    const msg = this.msg;
    return this.api.sendMediaGroup(orThrow(this.chatId, "sendMediaGroup"), media, {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  replyWithLocation(latitude, longitude, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendLocationEphemeralForCallback(callbackQueryId, latitude, longitude, options, signal) : this.api.sendLocation(orThrow(this.chatId, "sendLocation"), latitude, longitude, options, signal);
  }
  editMessageLiveLocation(latitude, longitude, other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.editMessageLiveLocationInline(inlineId, latitude, longitude, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal) : this.api.editMessageLiveLocation(orThrow(this.chatId, "editMessageLiveLocation"), orThrow(this.msgId, "editMessageLiveLocation"), latitude, longitude, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  stopMessageLiveLocation(other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.stopMessageLiveLocationInline(inlineId, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal) : this.api.stopMessageLiveLocation(orThrow(this.chatId, "stopMessageLiveLocation"), orThrow(this.msgId, "stopMessageLiveLocation"), {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  replyWithVenue(latitude, longitude, title2, address, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendVenueEphemeralForCallback(callbackQueryId, latitude, longitude, title2, address, options, signal) : this.api.sendVenue(orThrow(this.chatId, "sendVenue"), latitude, longitude, title2, address, options, signal);
  }
  replyWithContact(phone_number, first_name, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendContactEphemeralForCallback(callbackQueryId, phone_number, first_name, options, signal) : this.api.sendContact(orThrow(this.chatId, "sendContact"), phone_number, first_name, options, signal);
  }
  replyWithPoll(question, options, other, signal) {
    const msg = this.msg;
    return this.api.sendPoll(orThrow(this.chatId, "sendPoll"), question, options, {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      ...other
    }, signal);
  }
  replyWithChecklist(checklist, other, signal) {
    return this.api.sendChecklist(orThrow(this.businessConnectionId, "sendChecklist"), orThrow(this.chatId, "sendChecklist"), checklist, other, signal);
  }
  editMessageChecklist(checklist, other, signal) {
    const msg = orThrow(this.msg, "editMessageChecklist");
    const target = msg.checklist_tasks_done?.checklist_message ?? msg.checklist_tasks_added?.checklist_message ?? msg;
    return this.api.editMessageChecklist(orThrow(this.businessConnectionId, "editMessageChecklist"), orThrow(target.chat.id, "editMessageChecklist"), orThrow(target.message_id, "editMessageChecklist"), checklist, other, signal);
  }
  replyWithDice(emoji, other, signal) {
    const msg = this.msg;
    return this.api.sendDice(orThrow(this.chatId, "sendDice"), emoji, {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  replyWithChatAction(action, other, signal) {
    const msg = this.msg;
    return this.api.sendChatAction(orThrow(this.chatId, "sendChatAction"), action, {
      business_connection_id: this.businessConnectionId,
      message_thread_id: msg?.message_thread_id,
      ...other
    }, signal);
  }
  react(reaction, other, signal) {
    return this.api.setMessageReaction(orThrow(this.chatId, "setMessageReaction"), orThrow(this.msgId, "setMessageReaction"), typeof reaction === "string" ? [
      {
        type: "emoji",
        emoji: reaction
      }
    ] : (Array.isArray(reaction) ? reaction : [
      reaction
    ]).map((emoji) => typeof emoji === "string" ? {
      type: "emoji",
      emoji
    } : emoji), other, signal);
  }
  replyWithDraft(text, other, signal) {
    const msg = this.msg;
    return this.api.sendMessageDraft(orThrow(this.chatId, "sendMessageDraft"), this.update.update_id, text, {
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      ...other
    }, signal);
  }
  replyWithRichMessageDraft(rich_message, other, signal) {
    const msg = this.msg;
    return this.api.sendRichMessageDraft(orThrow(this.chatId, "sendMessageDraft"), this.update.update_id, rich_message, {
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      ...other
    }, signal);
  }
  getUserProfilePhotos(other, signal) {
    return this.api.getUserProfilePhotos(orThrow(this.from, "getUserProfilePhotos").id, other, signal);
  }
  getUserProfileAudios(other, signal) {
    return this.api.getUserProfileAudios(orThrow(this.from, "getUserProfileAudios").id, other, signal);
  }
  setUserEmojiStatus(other, signal) {
    return this.api.setUserEmojiStatus(orThrow(this.from, "setUserEmojiStatus").id, other, signal);
  }
  getUserChatBoosts(chat_id, signal) {
    return this.api.getUserChatBoosts(chat_id ?? orThrow(this.chatId, "getUserChatBoosts"), orThrow(this.from, "getUserChatBoosts").id, signal);
  }
  getUserGifts(other, signal) {
    return this.api.getUserGifts(orThrow(this.from, "getUserGifts").id, other, signal);
  }
  getChatGifts(other, signal) {
    return this.api.getChatGifts(orThrow(this.chatId, "getChatGifts"), other, signal);
  }
  getBusinessConnection(signal) {
    return this.api.getBusinessConnection(orThrow(this.businessConnectionId, "getBusinessConnection"), signal);
  }
  getManagedBotToken(signal) {
    return this.api.getManagedBotToken(orThrow(this.managedBot, "getManagedBotToken").bot.id, signal);
  }
  replaceManagedBotToken(signal) {
    return this.api.replaceManagedBotToken(orThrow(this.managedBot, "getManagedBotToken").bot.id, signal);
  }
  getManagedBotAccessSettings(signal) {
    return this.api.getManagedBotAccessSettings(orThrow(this.managedBot, "getManagedBotAccessSettings").bot.id, signal);
  }
  setManagedBotAccessSettings(is_access_restricted, other, signal) {
    return this.api.setManagedBotAccessSettings(orThrow(this.managedBot, "setManagedBotAccessSettings").bot.id, is_access_restricted, other, signal);
  }
  getFile(signal) {
    const m2 = orThrow(this.msg, "getFile");
    const file = m2.photo !== void 0 ? m2.photo[m2.photo.length - 1] : m2.animation ?? m2.audio ?? m2.document ?? m2.video ?? m2.video_note ?? m2.voice ?? m2.sticker;
    return this.api.getFile(orThrow(file, "getFile").file_id, signal);
  }
  kickAuthor(...args) {
    return this.banAuthor(...args);
  }
  banAuthor(other, signal) {
    return this.api.banChatMember(orThrow(this.chatId, "banAuthor"), orThrow(this.from, "banAuthor").id, other, signal);
  }
  kickChatMember(...args) {
    return this.banChatMember(...args);
  }
  banChatMember(user_id, other, signal) {
    return this.api.banChatMember(orThrow(this.chatId, "banChatMember"), user_id, other, signal);
  }
  unbanChatMember(user_id, other, signal) {
    return this.api.unbanChatMember(orThrow(this.chatId, "unbanChatMember"), user_id, other, signal);
  }
  restrictAuthor(permissions, other, signal) {
    return this.api.restrictChatMember(orThrow(this.chatId, "restrictAuthor"), orThrow(this.from, "restrictAuthor").id, permissions, other, signal);
  }
  restrictChatMember(user_id, permissions, other, signal) {
    return this.api.restrictChatMember(orThrow(this.chatId, "restrictChatMember"), user_id, permissions, other, signal);
  }
  promoteAuthor(other, signal) {
    return this.api.promoteChatMember(orThrow(this.chatId, "promoteAuthor"), orThrow(this.from, "promoteAuthor").id, other, signal);
  }
  promoteChatMember(user_id, other, signal) {
    return this.api.promoteChatMember(orThrow(this.chatId, "promoteChatMember"), user_id, other, signal);
  }
  setChatAdministratorAuthorCustomTitle(custom_title, signal) {
    return this.api.setChatAdministratorCustomTitle(orThrow(this.chatId, "setChatAdministratorAuthorCustomTitle"), orThrow(this.from, "setChatAdministratorAuthorCustomTitle").id, custom_title, signal);
  }
  setChatAdministratorCustomTitle(user_id, custom_title, signal) {
    return this.api.setChatAdministratorCustomTitle(orThrow(this.chatId, "setChatAdministratorCustomTitle"), user_id, custom_title, signal);
  }
  setAuthorTag(tag, signal) {
    return this.api.setChatMemberTag(orThrow(this.chatId, "setChatMemberTag"), orThrow(this.from, "setChatMemberTag").id, tag, signal);
  }
  setChatMemberTag(user_id, tag, signal) {
    return this.api.setChatMemberTag(orThrow(this.chatId, "setChatMemberTag"), user_id, tag, signal);
  }
  banChatSenderChat(sender_chat_id, signal) {
    return this.api.banChatSenderChat(orThrow(this.chatId, "banChatSenderChat"), sender_chat_id, signal);
  }
  unbanChatSenderChat(sender_chat_id, signal) {
    return this.api.unbanChatSenderChat(orThrow(this.chatId, "unbanChatSenderChat"), sender_chat_id, signal);
  }
  setChatPermissions(permissions, other, signal) {
    return this.api.setChatPermissions(orThrow(this.chatId, "setChatPermissions"), permissions, other, signal);
  }
  exportChatInviteLink(signal) {
    return this.api.exportChatInviteLink(orThrow(this.chatId, "exportChatInviteLink"), signal);
  }
  createChatInviteLink(other, signal) {
    return this.api.createChatInviteLink(orThrow(this.chatId, "createChatInviteLink"), other, signal);
  }
  editChatInviteLink(invite_link, other, signal) {
    return this.api.editChatInviteLink(orThrow(this.chatId, "editChatInviteLink"), invite_link, other, signal);
  }
  createChatSubscriptionInviteLink(subscription_period, subscription_price, other, signal) {
    return this.api.createChatSubscriptionInviteLink(orThrow(this.chatId, "createChatSubscriptionInviteLink"), subscription_period, subscription_price, other, signal);
  }
  editChatSubscriptionInviteLink(invite_link, other, signal) {
    return this.api.editChatSubscriptionInviteLink(orThrow(this.chatId, "editChatSubscriptionInviteLink"), invite_link, other, signal);
  }
  revokeChatInviteLink(invite_link, signal) {
    return this.api.revokeChatInviteLink(orThrow(this.chatId, "editChatInviteLink"), invite_link, signal);
  }
  approveChatJoinRequest(user_id, signal) {
    return this.api.approveChatJoinRequest(orThrow(this.chatId, "approveChatJoinRequest"), user_id, signal);
  }
  declineChatJoinRequest(user_id, signal) {
    return this.api.declineChatJoinRequest(orThrow(this.chatId, "declineChatJoinRequest"), user_id, signal);
  }
  answerChatJoinRequestQuery(result, signal) {
    return this.api.answerChatJoinRequestQuery(orThrow(this.chatJoinRequest?.query_id, "answerChatJoinRequestQuery"), result, signal);
  }
  replyWithChatJoinRequestWebApp(web_app_url, signal) {
    return this.api.sendChatJoinRequestWebApp(orThrow(this.chatJoinRequest?.query_id, "answerChatJoinRequestQuery"), web_app_url, signal);
  }
  approveSuggestedPost(other, signal) {
    return this.api.approveSuggestedPost(orThrow(this.chatId, "approveSuggestedPost"), orThrow(this.msgId, "approveSuggestedPost"), other, signal);
  }
  declineSuggestedPost(other, signal) {
    return this.api.declineSuggestedPost(orThrow(this.chatId, "declineSuggestedPost"), orThrow(this.msgId, "declineSuggestedPost"), other, signal);
  }
  setChatPhoto(photo, signal) {
    return this.api.setChatPhoto(orThrow(this.chatId, "setChatPhoto"), photo, signal);
  }
  deleteChatPhoto(signal) {
    return this.api.deleteChatPhoto(orThrow(this.chatId, "deleteChatPhoto"), signal);
  }
  setChatTitle(title2, signal) {
    return this.api.setChatTitle(orThrow(this.chatId, "setChatTitle"), title2, signal);
  }
  setChatDescription(description, signal) {
    return this.api.setChatDescription(orThrow(this.chatId, "setChatDescription"), description, signal);
  }
  pinChatMessage(message_id, other, signal) {
    return this.api.pinChatMessage(orThrow(this.chatId, "pinChatMessage"), message_id, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  unpinChatMessage(message_id, other, signal) {
    return this.api.unpinChatMessage(orThrow(this.chatId, "unpinChatMessage"), message_id, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  unpinAllChatMessages(signal) {
    return this.api.unpinAllChatMessages(orThrow(this.chatId, "unpinAllChatMessages"), signal);
  }
  leaveChat(signal) {
    return this.api.leaveChat(orThrow(this.chatId, "leaveChat"), signal);
  }
  getChat(signal) {
    return this.api.getChat(orThrow(this.chatId, "getChat"), signal);
  }
  getChatAdministrators(other, signal) {
    return this.api.getChatAdministrators(orThrow(this.chatId, "getChatAdministrators"), other, signal);
  }
  getChatMembersCount(...args) {
    return this.getChatMemberCount(...args);
  }
  getChatMemberCount(signal) {
    return this.api.getChatMemberCount(orThrow(this.chatId, "getChatMemberCount"), signal);
  }
  getAuthor(signal) {
    return this.api.getChatMember(orThrow(this.chatId, "getAuthor"), orThrow(this.from, "getAuthor").id, signal);
  }
  getChatMember(user_id, signal) {
    return this.api.getChatMember(orThrow(this.chatId, "getChatMember"), user_id, signal);
  }
  getUserPersonalChatMessages(limit, signal) {
    return this.api.getUserPersonalChatMessages(orThrow(this.from, "getUserPersonalChatMessages").id, limit, signal);
  }
  setChatStickerSet(sticker_set_name, signal) {
    return this.api.setChatStickerSet(orThrow(this.chatId, "setChatStickerSet"), sticker_set_name, signal);
  }
  deleteChatStickerSet(signal) {
    return this.api.deleteChatStickerSet(orThrow(this.chatId, "deleteChatStickerSet"), signal);
  }
  createForumTopic(name, other, signal) {
    return this.api.createForumTopic(orThrow(this.chatId, "createForumTopic"), name, other, signal);
  }
  editForumTopic(other, signal) {
    const message = orThrow(this.msg, "editForumTopic");
    const thread = orThrow(message.message_thread_id, "editForumTopic");
    return this.api.editForumTopic(message.chat.id, thread, other, signal);
  }
  closeForumTopic(signal) {
    const message = orThrow(this.msg, "closeForumTopic");
    const thread = orThrow(message.message_thread_id, "closeForumTopic");
    return this.api.closeForumTopic(message.chat.id, thread, signal);
  }
  reopenForumTopic(signal) {
    const message = orThrow(this.msg, "reopenForumTopic");
    const thread = orThrow(message.message_thread_id, "reopenForumTopic");
    return this.api.reopenForumTopic(message.chat.id, thread, signal);
  }
  deleteForumTopic(signal) {
    const message = orThrow(this.msg, "deleteForumTopic");
    const thread = orThrow(message.message_thread_id, "deleteForumTopic");
    return this.api.deleteForumTopic(message.chat.id, thread, signal);
  }
  unpinAllForumTopicMessages(signal) {
    const message = orThrow(this.msg, "unpinAllForumTopicMessages");
    const thread = orThrow(message.message_thread_id, "unpinAllForumTopicMessages");
    return this.api.unpinAllForumTopicMessages(message.chat.id, thread, signal);
  }
  editGeneralForumTopic(name, signal) {
    return this.api.editGeneralForumTopic(orThrow(this.chatId, "editGeneralForumTopic"), name, signal);
  }
  closeGeneralForumTopic(signal) {
    return this.api.closeGeneralForumTopic(orThrow(this.chatId, "closeGeneralForumTopic"), signal);
  }
  reopenGeneralForumTopic(signal) {
    return this.api.reopenGeneralForumTopic(orThrow(this.chatId, "reopenGeneralForumTopic"), signal);
  }
  hideGeneralForumTopic(signal) {
    return this.api.hideGeneralForumTopic(orThrow(this.chatId, "hideGeneralForumTopic"), signal);
  }
  unhideGeneralForumTopic(signal) {
    return this.api.unhideGeneralForumTopic(orThrow(this.chatId, "unhideGeneralForumTopic"), signal);
  }
  unpinAllGeneralForumTopicMessages(signal) {
    return this.api.unpinAllGeneralForumTopicMessages(orThrow(this.chatId, "unpinAllGeneralForumTopicMessages"), signal);
  }
  answerCallbackQuery(other, signal) {
    return this.api.answerCallbackQuery(orThrow(this.callbackQuery, "answerCallbackQuery").id, typeof other === "string" ? {
      text: other
    } : other, signal);
  }
  answerWidgetQuery(other, signal) {
    return this.api.answerWidgetQuery(orThrow(this.widgetQuery?.id ?? this.sharedWidgetQuery?.id, "answerWidgetQuery"), other, signal);
  }
  answerGuestQuery(result, signal) {
    return this.api.answerGuestQuery(orThrow(this.guestMessage?.guest_query_id, "answerGuestQuery"), result, signal);
  }
  setChatMenuButton(other, signal) {
    return this.api.setChatMenuButton(other, signal);
  }
  getChatMenuButton(other, signal) {
    return this.api.getChatMenuButton(other, signal);
  }
  setMyDefaultAdministratorRights(other, signal) {
    return this.api.setMyDefaultAdministratorRights(other, signal);
  }
  getMyDefaultAdministratorRights(other, signal) {
    return this.api.getMyDefaultAdministratorRights(other, signal);
  }
  editMessageText(text, other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.editMessageTextInline(inlineId, text, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal) : this.api.editMessageText(orThrow(this.chatId, "editMessageText"), orThrow(this.msgId, "editMessageText"), text, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  editMessageCaption(other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.editMessageCaptionInline(inlineId, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal) : this.api.editMessageCaption(orThrow(this.chatId, "editMessageCaption"), orThrow(this.msgId, "editMessageCaption"), {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  editMessageMedia(media, other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.editMessageMediaInline(inlineId, media, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal) : this.api.editMessageMedia(orThrow(this.chatId, "editMessageMedia"), orThrow(this.msgId, "editMessageMedia"), media, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  editMessageWidgetData(other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.editMessageWidgetDataInline(inlineId, other, signal) : this.api.editMessageWidgetData(orThrow(this.chatId, "editMessageWidgetData"), orThrow(this.msgId, "editMessageWidgetData"), other, signal);
  }
  editSharedWidgetData(public_data, other, signal) {
    return this.api.editSharedWidgetData(orThrow(this.widgetQuery?.widget_id ?? this.sharedWidgetQuery?.widget_id ?? this.msg?.widget?.id, "editSharedWidgetData"), public_data, other, signal);
  }
  editMessageReplyMarkup(other, signal) {
    const inlineId = this.inlineMessageId;
    return inlineId !== void 0 ? this.api.editMessageReplyMarkupInline(inlineId, {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal) : this.api.editMessageReplyMarkup(orThrow(this.chatId, "editMessageReplyMarkup"), orThrow(this.msgId, "editMessageReplyMarkup"), {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  stopPoll(other, signal) {
    return this.api.stopPoll(orThrow(this.chatId, "stopPoll"), orThrow(this.msgId, "stopPoll"), {
      business_connection_id: this.businessConnectionId,
      ...other
    }, signal);
  }
  editEphemeralMessageText(text_or_rich_message, other, signal) {
    const msg = orThrow(this.msg, "editEphemeralMessageText");
    return this.api.editEphemeralMessageText(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageText").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageText"), text_or_rich_message, other, signal);
  }
  editEphemeralMessageMedia(media, other, signal) {
    const msg = orThrow(this.msg, "editEphemeralMessageMedia");
    return this.api.editEphemeralMessageMedia(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageMedia").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageMedia"), media, other, signal);
  }
  editEphemeralMessageCaption(caption, other, signal) {
    const msg = orThrow(this.msg, "editEphemeralMessageCaption");
    return this.api.editEphemeralMessageCaption(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageCaption").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageCaption"), caption, other, signal);
  }
  editEphemeralMessageReplyMarkup(other, signal) {
    const msg = orThrow(this.msg, "editEphemeralMessageReplyMarkup");
    return this.api.editEphemeralMessageReplyMarkup(msg.chat.id, orThrow(msg.receiver_user, "editEphemeralMessageReplyMarkup").id, orThrow(msg.ephemeral_message_id, "editEphemeralMessageReplyMarkup"), other, signal);
  }
  deleteMessage(signal) {
    return this.api.deleteMessage(orThrow(this.chatId, "deleteMessage"), orThrow(this.msgId, "deleteMessage"), signal);
  }
  deleteMessages(message_ids, signal) {
    return this.api.deleteMessages(orThrow(this.chatId, "deleteMessages"), message_ids, signal);
  }
  deleteEphemeralMessage(signal) {
    const msg = orThrow(this.msg, "deleteEphemeralMessage");
    return this.api.deleteEphemeralMessage(msg.chat.id, orThrow(msg.receiver_user, "deleteEphemeralMessage").id, orThrow(msg.ephemeral_message_id, "deleteEphemeralMessage"), signal);
  }
  deleteMessageReaction(other, signal) {
    const reaction = orThrow(this.messageReaction, "deleteMessageReaction");
    if (reaction.user !== void 0) {
      return this.deleteMessageReactionUser(reaction.user.id, other, signal);
    } else if (reaction.actor_chat !== void 0) {
      return this.deleteMessageReactionChat(reaction.actor_chat.id, other, signal);
    } else {
      throw new Error("Missing information from message_reaction update for API call to deleteMessageReaction");
    }
  }
  deleteMessageReactionUser(user_id, other, signal) {
    return this.api.deleteMessageReactionUser(orThrow(this.chatId, "deleteMessageReactionUser"), orThrow(this.msgId, "deleteMessageReactionUser"), user_id, other, signal);
  }
  deleteMessageReactionChat(actor_chat_id, other, signal) {
    return this.api.deleteMessageReactionChat(orThrow(this.chatId, "deleteMessageReactionChat"), orThrow(this.msgId, "deleteMessageReactionChat"), actor_chat_id, other, signal);
  }
  deleteAllMessageReactions(other, signal) {
    const chatId = orThrow(this.chatId, "deleteAllMessageReactions");
    const actor = this.messageReaction?.actor_chat ?? this.senderChat ?? this.pollAnswer?.voter_chat;
    if (actor !== void 0) {
      return this.api.deleteAllMessageReactionsChat(chatId, actor.id, other, signal);
    }
    const userId = orThrow(this.from, "deleteAllMessageReactions").id;
    return this.api.deleteAllMessageReactionsUser(chatId, userId, other, signal);
  }
  deleteAllMessageReactionsUser(user_id, other, signal) {
    return this.api.deleteAllMessageReactionsUser(orThrow(this.chatId, "deleteAllMessageReactionsUser"), user_id, other, signal);
  }
  deleteAllMessageReactionsChat(actor_chat_id, other, signal) {
    return this.api.deleteAllMessageReactionsChat(orThrow(this.chatId, "deleteAllMessageReactionsChat"), actor_chat_id, other, signal);
  }
  deleteBusinessMessages(message_ids, signal) {
    return this.api.deleteBusinessMessages(orThrow(this.businessConnectionId, "deleteBusinessMessages"), message_ids, signal);
  }
  setBusinessAccountName(first_name, other, signal) {
    return this.api.setBusinessAccountName(orThrow(this.businessConnectionId, "setBusinessAccountName"), first_name, other, signal);
  }
  setBusinessAccountUsername(username, signal) {
    return this.api.setBusinessAccountUsername(orThrow(this.businessConnectionId, "setBusinessAccountUsername"), username, signal);
  }
  setBusinessAccountBio(bio, signal) {
    return this.api.setBusinessAccountBio(orThrow(this.businessConnectionId, "setBusinessAccountBio"), bio, signal);
  }
  setBusinessAccountProfilePhoto(photo, other, signal) {
    return this.api.setBusinessAccountProfilePhoto(orThrow(this.businessConnectionId, "setBusinessAccountProfilePhoto"), photo, other, signal);
  }
  removeBusinessAccountProfilePhoto(other, signal) {
    return this.api.removeBusinessAccountProfilePhoto(orThrow(this.businessConnectionId, "removeBusinessAccountProfilePhoto"), other, signal);
  }
  setBusinessAccountGiftSettings(show_gift_button, accepted_gift_types, signal) {
    return this.api.setBusinessAccountGiftSettings(orThrow(this.businessConnectionId, "setBusinessAccountGiftSettings"), show_gift_button, accepted_gift_types, signal);
  }
  getBusinessAccountStarBalance(signal) {
    return this.api.getBusinessAccountStarBalance(orThrow(this.businessConnectionId, "getBusinessAccountStarBalance"), signal);
  }
  transferBusinessAccountStars(star_count, signal) {
    return this.api.transferBusinessAccountStars(orThrow(this.businessConnectionId, "transferBusinessAccountStars"), star_count, signal);
  }
  getBusinessAccountGifts(other, signal) {
    return this.api.getBusinessAccountGifts(orThrow(this.businessConnectionId, "getBusinessAccountGifts"), other, signal);
  }
  convertGiftToStars(owned_gift_id, signal) {
    return this.api.convertGiftToStars(orThrow(this.businessConnectionId, "convertGiftToStars"), owned_gift_id, signal);
  }
  upgradeGift(owned_gift_id, other, signal) {
    return this.api.upgradeGift(orThrow(this.businessConnectionId, "upgradeGift"), owned_gift_id, other, signal);
  }
  transferGift(owned_gift_id, new_owner_chat_id, star_count, signal) {
    return this.api.transferGift(orThrow(this.businessConnectionId, "transferGift"), owned_gift_id, new_owner_chat_id, star_count, signal);
  }
  deleteBusinessAccountGift(owned_gift_id, signal) {
    return this.api.deleteBusinessAccountGift(orThrow(this.businessConnectionId, "deleteBusinessAccountGift"), owned_gift_id, signal);
  }
  postStory(content, active_period, other, signal) {
    return this.api.postStory(orThrow(this.businessConnectionId, "postStory"), content, active_period, other, signal);
  }
  repostStory(active_period, other, signal) {
    const story = orThrow(this.msg?.story, "repostStory");
    return this.api.repostStory(orThrow(this.businessConnectionId, "repostStory"), story.chat.id, story.id, active_period, other, signal);
  }
  editStory(story_id, content, other, signal) {
    return this.api.editStory(orThrow(this.businessConnectionId, "editStory"), story_id, content, other, signal);
  }
  deleteStory(story_id, signal) {
    return this.api.deleteStory(orThrow(this.businessConnectionId, "deleteStory"), story_id, signal);
  }
  replyWithSticker(sticker, other, signal) {
    const msg = this.msg;
    const options = {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    };
    const ephemeral = other?.ephemeral_message_parameters;
    const callbackQueryId = ephemeral?.receiver_user_id === void 0 ? ephemeral?.callback_query_id : void 0;
    return callbackQueryId !== void 0 ? this.api.sendStickerEphemeralForCallback(callbackQueryId, sticker, options, signal) : this.api.sendSticker(orThrow(this.chatId, "sendSticker"), sticker, options, signal);
  }
  getCustomEmojiStickers(signal) {
    return this.api.getCustomEmojiStickers((this.msg?.entities ?? []).filter((e) => e.type === "custom_emoji").map((e) => e.custom_emoji_id), signal);
  }
  replyWithGift(gift_id, other, signal) {
    return this.api.sendGift(orThrow(this.from, "sendGift").id, gift_id, other, signal);
  }
  giftPremiumSubscription(month_count, star_count, other, signal) {
    return this.api.giftPremiumSubscription(orThrow(this.from, "giftPremiumSubscription").id, month_count, star_count, other, signal);
  }
  replyWithGiftToChannel(gift_id, other, signal) {
    return this.api.sendGiftToChannel(orThrow(this.chat, "sendGift").id, gift_id, other, signal);
  }
  answerInlineQuery(results, other, signal) {
    return this.api.answerInlineQuery(orThrow(this.inlineQuery, "answerInlineQuery").id, results, other, signal);
  }
  savePreparedInlineMessage(result, other, signal) {
    return this.api.savePreparedInlineMessage(orThrow(this.from, "savePreparedInlineMessage").id, result, other, signal);
  }
  savePreparedKeyboardButton(button, signal) {
    return this.api.savePreparedKeyboardButton(orThrow(this.from, "savePreparedKeyboardButton").id, button, signal);
  }
  replyWithInvoice(title2, description, payload, currency, prices, other, signal) {
    const msg = this.msg;
    return this.api.sendInvoice(orThrow(this.chatId, "sendInvoice"), title2, description, payload, currency, prices, {
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      direct_messages_topic_id: msg?.direct_messages_topic?.topic_id,
      ...other
    }, signal);
  }
  answerShippingQuery(ok2, other, signal) {
    return this.api.answerShippingQuery(orThrow(this.shippingQuery, "answerShippingQuery").id, ok2, other, signal);
  }
  answerPreCheckoutQuery(ok2, other, signal) {
    return this.api.answerPreCheckoutQuery(orThrow(this.preCheckoutQuery, "answerPreCheckoutQuery").id, ok2, typeof other === "string" ? {
      error_message: other
    } : other, signal);
  }
  refundStarPayment(signal) {
    return this.api.refundStarPayment(orThrow(this.from, "refundStarPayment").id, orThrow(this.msg?.successful_payment, "refundStarPayment").telegram_payment_charge_id, signal);
  }
  editUserStarSubscription(telegram_payment_charge_id, is_canceled, signal) {
    return this.api.editUserStarSubscription(orThrow(this.from, "editUserStarSubscription").id, telegram_payment_charge_id, is_canceled, signal);
  }
  verifyUser(other, signal) {
    return this.api.verifyUser(orThrow(this.from, "verifyUser").id, other, signal);
  }
  verifyChat(other, signal) {
    return this.api.verifyChat(orThrow(this.chatId, "verifyChat"), other, signal);
  }
  removeUserVerification(signal) {
    return this.api.removeUserVerification(orThrow(this.from, "removeUserVerification").id, signal);
  }
  removeChatVerification(signal) {
    return this.api.removeChatVerification(orThrow(this.chatId, "removeChatVerification"), signal);
  }
  readBusinessMessage(signal) {
    return this.api.readBusinessMessage(orThrow(this.businessConnectionId, "readBusinessMessage"), orThrow(this.chatId, "readBusinessMessage"), orThrow(this.msgId, "readBusinessMessage"), signal);
  }
  setPassportDataErrors(errors, signal) {
    return this.api.setPassportDataErrors(orThrow(this.from, "setPassportDataErrors").id, errors, signal);
  }
  replyWithGame(game_short_name, other, signal) {
    const msg = this.msg;
    return this.api.sendGame(orThrow(this.chatId, "sendGame"), game_short_name, {
      business_connection_id: this.businessConnectionId,
      ...msg?.is_topic_message ? {
        message_thread_id: msg.message_thread_id
      } : {},
      ...other
    }, signal);
  }
};
function orThrow(value, method) {
  if (value === void 0) {
    throw new Error(`Missing information for API call to ${method}`);
  }
  return value;
}
__name(orThrow, "orThrow");
function triggerFn(trigger) {
  return toArray(trigger).map((t) => typeof t === "string" ? (txt) => txt === t ? t : null : (txt) => txt.match(t));
}
__name(triggerFn, "triggerFn");
function match(ctx, content, triggers) {
  for (const t of triggers) {
    const res = t(content);
    if (res) {
      ctx.match = res;
      return true;
    }
  }
  return false;
}
__name(match, "match");
function toArray(e) {
  return Array.isArray(e) ? e : [
    e
  ];
}
__name(toArray, "toArray");
var BotError = class extends Error {
  static {
    __name(this, "BotError");
  }
  error;
  ctx;
  constructor(error, ctx) {
    super(generateBotErrorMessage(error));
    this.error = error;
    this.ctx = ctx;
    this.name = "BotError";
    if (error instanceof Error) this.stack = error.stack;
  }
};
function generateBotErrorMessage(error) {
  let msg;
  if (error instanceof Error) {
    msg = `${error.name} in middleware: ${error.message}`;
  } else {
    const type = typeof error;
    msg = `Non-error value of type ${type} thrown in middleware`;
    switch (type) {
      case "bigint":
      case "boolean":
      case "number":
      case "symbol":
        msg += `: ${error}`;
        break;
      case "string":
        msg += `: ${String(error).substring(0, 50)}`;
        break;
      default:
        msg += "!";
        break;
    }
  }
  return msg;
}
__name(generateBotErrorMessage, "generateBotErrorMessage");
function flatten(mw) {
  return typeof mw === "function" ? mw : (ctx, next) => mw.middleware()(ctx, next);
}
__name(flatten, "flatten");
function concat1(first, andThen) {
  return async (ctx, next) => {
    let nextCalled = false;
    await first(ctx, async () => {
      if (nextCalled) throw new Error("`next` already called before!");
      else nextCalled = true;
      await andThen(ctx, next);
    });
  };
}
__name(concat1, "concat1");
function pass(_ctx, next) {
  return next();
}
__name(pass, "pass");
var leaf1 = /* @__PURE__ */ __name(() => Promise.resolve(), "leaf1");
async function run(middleware, ctx) {
  await middleware(ctx, leaf1);
}
__name(run, "run");
var Composer = class _Composer {
  static {
    __name(this, "Composer");
  }
  handler;
  constructor(...middleware) {
    this.handler = middleware.length === 0 ? pass : middleware.map(flatten).reduce(concat1);
  }
  middleware() {
    return this.handler;
  }
  use(...middleware) {
    const composer = new _Composer(...middleware);
    this.handler = concat1(this.handler, flatten(composer));
    return composer;
  }
  on(filter, ...middleware) {
    return this.filter(Context.has.filterQuery(filter), ...middleware);
  }
  hears(trigger, ...middleware) {
    return this.filter(Context.has.text(trigger), ...middleware);
  }
  command(command, ...middleware) {
    return this.filter(Context.has.command(command), ...middleware);
  }
  reaction(reaction, ...middleware) {
    return this.filter(Context.has.reaction(reaction), ...middleware);
  }
  chatType(chatType, ...middleware) {
    return this.filter(Context.has.chatType(chatType), ...middleware);
  }
  callbackQuery(trigger, ...middleware) {
    return this.filter(Context.has.callbackQuery(trigger), ...middleware);
  }
  widgetQuery(trigger, ...middleware) {
    return this.filter(Context.has.widgetQuery(trigger), ...middleware);
  }
  sharedWidgetQuery(trigger, ...middleware) {
    return this.filter(Context.has.sharedWidgetQuery(trigger), ...middleware);
  }
  gameQuery(trigger, ...middleware) {
    return this.filter(Context.has.gameQuery(trigger), ...middleware);
  }
  inlineQuery(trigger, ...middleware) {
    return this.filter(Context.has.inlineQuery(trigger), ...middleware);
  }
  chosenInlineResult(resultId, ...middleware) {
    return this.filter(Context.has.chosenInlineResult(resultId), ...middleware);
  }
  preCheckoutQuery(trigger, ...middleware) {
    return this.filter(Context.has.preCheckoutQuery(trigger), ...middleware);
  }
  shippingQuery(trigger, ...middleware) {
    return this.filter(Context.has.shippingQuery(trigger), ...middleware);
  }
  filter(predicate, ...middleware) {
    const composer = new _Composer(...middleware);
    this.branch(predicate, composer, pass);
    return composer;
  }
  drop(predicate, ...middleware) {
    return this.filter(async (ctx) => !await predicate(ctx), ...middleware);
  }
  fork(...middleware) {
    const composer = new _Composer(...middleware);
    const fork = flatten(composer);
    this.use((ctx, next) => Promise.all([
      next(),
      run(fork, ctx)
    ]));
    return composer;
  }
  lazy(middlewareFactory) {
    return this.use(async (ctx, next) => {
      const middleware = await middlewareFactory(ctx);
      const arr = Array.isArray(middleware) ? middleware : [
        middleware
      ];
      await flatten(new _Composer(...arr))(ctx, next);
    });
  }
  route(router, routeHandlers, fallback = pass) {
    return this.lazy(async (ctx) => {
      const route = await router(ctx);
      return (route === void 0 || !routeHandlers[route] ? fallback : routeHandlers[route]) ?? [];
    });
  }
  branch(predicate, trueMiddleware, falseMiddleware) {
    return this.lazy(async (ctx) => await predicate(ctx) ? trueMiddleware : falseMiddleware);
  }
  errorBoundary(errorHandler, ...middleware) {
    const composer = new _Composer(...middleware);
    const bound = flatten(composer);
    this.use(async (ctx, next) => {
      let nextCalled = false;
      const cont = /* @__PURE__ */ __name(() => (nextCalled = true, Promise.resolve()), "cont");
      try {
        await bound(ctx, cont);
      } catch (err) {
        nextCalled = false;
        await errorHandler(new BotError(err, ctx), cont);
      }
      if (nextCalled) await next();
    });
    return composer;
  }
};
var s = 1e3;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;
var ms = /* @__PURE__ */ __name(function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === "string" && val.length > 0) {
    return parse1(val);
  } else if (type === "number" && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
}, "ms");
function parse1(str2) {
  str2 = String(str2);
  if (str2.length > 100) {
    return;
  }
  var match2 = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str2);
  if (!match2) {
    return;
  }
  var n = parseFloat(match2[1]);
  var type = (match2[2] || "ms").toLowerCase();
  switch (type) {
    case "years":
    case "year":
    case "yrs":
    case "yr":
    case "y":
      return n * y;
    case "weeks":
    case "week":
    case "w":
      return n * w;
    case "days":
    case "day":
    case "d":
      return n * d;
    case "hours":
    case "hour":
    case "hrs":
    case "hr":
    case "h":
      return n * h;
    case "minutes":
    case "minute":
    case "mins":
    case "min":
    case "m":
      return n * m;
    case "seconds":
    case "second":
    case "secs":
    case "sec":
    case "s":
      return n * s;
    case "milliseconds":
    case "millisecond":
    case "msecs":
    case "msec":
    case "ms":
      return n;
    default:
      return void 0;
  }
}
__name(parse1, "parse1");
function fmtShort(ms2) {
  var msAbs = Math.abs(ms2);
  if (msAbs >= d) {
    return Math.round(ms2 / d) + "d";
  }
  if (msAbs >= h) {
    return Math.round(ms2 / h) + "h";
  }
  if (msAbs >= m) {
    return Math.round(ms2 / m) + "m";
  }
  if (msAbs >= s) {
    return Math.round(ms2 / s) + "s";
  }
  return ms2 + "ms";
}
__name(fmtShort, "fmtShort");
function fmtLong(ms2) {
  var msAbs = Math.abs(ms2);
  if (msAbs >= d) {
    return plural(ms2, msAbs, d, "day");
  }
  if (msAbs >= h) {
    return plural(ms2, msAbs, h, "hour");
  }
  if (msAbs >= m) {
    return plural(ms2, msAbs, m, "minute");
  }
  if (msAbs >= s) {
    return plural(ms2, msAbs, s, "second");
  }
  return ms2 + " ms";
}
__name(fmtLong, "fmtLong");
function plural(ms2, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
}
__name(plural, "plural");
function defaultSetTimout() {
  throw new Error("setTimeout has not been defined");
}
__name(defaultSetTimout, "defaultSetTimout");
function defaultClearTimeout() {
  throw new Error("clearTimeout has not been defined");
}
__name(defaultClearTimeout, "defaultClearTimeout");
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
var globalContext;
if (typeof window !== "undefined") {
  globalContext = window;
} else if (typeof self !== "undefined") {
  globalContext = self;
} else {
  globalContext = {};
}
if (typeof globalContext.setTimeout === "function") {
  cachedSetTimeout = setTimeout;
}
if (typeof globalContext.clearTimeout === "function") {
  cachedClearTimeout = clearTimeout;
}
function runTimeout(fun) {
  if (cachedSetTimeout === setTimeout) {
    return setTimeout(fun, 0);
  }
  if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
    cachedSetTimeout = setTimeout;
    return setTimeout(fun, 0);
  }
  try {
    return cachedSetTimeout(fun, 0);
  } catch (e) {
    try {
      return cachedSetTimeout.call(null, fun, 0);
    } catch (e2) {
      return cachedSetTimeout.call(this, fun, 0);
    }
  }
}
__name(runTimeout, "runTimeout");
function runClearTimeout(marker) {
  if (cachedClearTimeout === clearTimeout) {
    return clearTimeout(marker);
  }
  if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
    cachedClearTimeout = clearTimeout;
    return clearTimeout(marker);
  }
  try {
    return cachedClearTimeout(marker);
  } catch (e) {
    try {
      return cachedClearTimeout.call(null, marker);
    } catch (e2) {
      return cachedClearTimeout.call(this, marker);
    }
  }
}
__name(runClearTimeout, "runClearTimeout");
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;
function cleanUpNextTick() {
  if (!draining || !currentQueue) {
    return;
  }
  draining = false;
  if (currentQueue.length) {
    queue = currentQueue.concat(queue);
  } else {
    queueIndex = -1;
  }
  if (queue.length) {
    drainQueue();
  }
}
__name(cleanUpNextTick, "cleanUpNextTick");
function drainQueue() {
  if (draining) {
    return;
  }
  var timeout = runTimeout(cleanUpNextTick);
  draining = true;
  var len = queue.length;
  while (len) {
    currentQueue = queue;
    queue = [];
    while (++queueIndex < len) {
      if (currentQueue) {
        currentQueue[queueIndex].run();
      }
    }
    queueIndex = -1;
    len = queue.length;
  }
  currentQueue = null;
  draining = false;
  runClearTimeout(timeout);
}
__name(drainQueue, "drainQueue");
function nextTick(fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining) {
    runTimeout(drainQueue);
  }
}
__name(nextTick, "nextTick");
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
__name(Item, "Item");
Item.prototype.run = function() {
  this.fun.apply(null, this.array);
};
var title = "browser";
var platform = "browser";
var browser = true;
var argv = [];
var version = "";
var versions = {};
var release = {};
var config = {};
function noop() {
}
__name(noop, "noop");
var on = noop;
var addListener = noop;
var once = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = noop;
function binding(name) {
  throw new Error("process.binding is not supported");
}
__name(binding, "binding");
function cwd() {
  return "/";
}
__name(cwd, "cwd");
function chdir(dir) {
  throw new Error("process.chdir is not supported");
}
__name(chdir, "chdir");
function umask() {
  return 0;
}
__name(umask, "umask");
var performance = globalContext.performance || {};
var performanceNow = performance.now || performance.mozNow || performance.msNow || performance.oNow || performance.webkitNow || function() {
  return (/* @__PURE__ */ new Date()).getTime();
};
function hrtime(previousTimestamp) {
  var clocktime = performanceNow.call(performance) * 1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor(clocktime % 1 * 1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [
    seconds,
    nanoseconds
  ];
}
__name(hrtime, "hrtime");
var startTime = /* @__PURE__ */ new Date();
function uptime() {
  var currentTime = /* @__PURE__ */ new Date();
  var dif = currentTime - startTime;
  return dif / 1e3;
}
__name(uptime, "uptime");
var process = {
  nextTick,
  title,
  browser,
  env: {
    NODE_ENV: "production"
  },
  argv,
  version,
  versions,
  on,
  addListener,
  once,
  off,
  removeListener,
  removeAllListeners,
  emit,
  binding,
  cwd,
  chdir,
  umask,
  hrtime,
  platform,
  release,
  config,
  uptime
};
function createCommonjsModule(fn, basedir, module) {
  return module = {
    path: basedir,
    exports: {},
    require: /* @__PURE__ */ __name(function(path, base) {
      return commonjsRequire(path, base === void 0 || base === null ? module.path : base);
    }, "require")
  }, fn(module, module.exports), module.exports;
}
__name(createCommonjsModule, "createCommonjsModule");
function commonjsRequire() {
  throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
__name(commonjsRequire, "commonjsRequire");
function setup(env) {
  createDebug.debug = createDebug;
  createDebug.default = createDebug;
  createDebug.coerce = coerce;
  createDebug.disable = disable;
  createDebug.enable = enable;
  createDebug.enabled = enabled;
  createDebug.humanize = ms;
  createDebug.destroy = destroy2;
  Object.keys(env).forEach((key) => {
    createDebug[key] = env[key];
  });
  createDebug.names = [];
  createDebug.skips = [];
  createDebug.formatters = {};
  function selectColor(namespace) {
    let hash = 0;
    for (let i = 0; i < namespace.length; i++) {
      hash = (hash << 5) - hash + namespace.charCodeAt(i);
      hash |= 0;
    }
    return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
  }
  __name(selectColor, "selectColor");
  createDebug.selectColor = selectColor;
  function createDebug(namespace) {
    let prevTime;
    let enableOverride = null;
    let namespacesCache;
    let enabledCache;
    function debug4(...args) {
      if (!debug4.enabled) {
        return;
      }
      const self2 = debug4;
      const curr = Number(/* @__PURE__ */ new Date());
      const ms2 = curr - (prevTime || curr);
      self2.diff = ms2;
      self2.prev = prevTime;
      self2.curr = curr;
      prevTime = curr;
      args[0] = createDebug.coerce(args[0]);
      if (typeof args[0] !== "string") {
        args.unshift("%O");
      }
      let index = 0;
      args[0] = args[0].replace(/%([a-zA-Z%])/g, (match2, format) => {
        if (match2 === "%%") {
          return "%";
        }
        index++;
        const formatter = createDebug.formatters[format];
        if (typeof formatter === "function") {
          const val = args[index];
          match2 = formatter.call(self2, val);
          args.splice(index, 1);
          index--;
        }
        return match2;
      });
      createDebug.formatArgs.call(self2, args);
      const logFn = self2.log || createDebug.log;
      logFn.apply(self2, args);
    }
    __name(debug4, "debug");
    debug4.namespace = namespace;
    debug4.useColors = createDebug.useColors();
    debug4.color = createDebug.selectColor(namespace);
    debug4.extend = extend;
    debug4.destroy = createDebug.destroy;
    Object.defineProperty(debug4, "enabled", {
      enumerable: true,
      configurable: false,
      get: /* @__PURE__ */ __name(() => {
        if (enableOverride !== null) {
          return enableOverride;
        }
        if (namespacesCache !== createDebug.namespaces) {
          namespacesCache = createDebug.namespaces;
          enabledCache = createDebug.enabled(namespace);
        }
        return enabledCache;
      }, "get"),
      set: /* @__PURE__ */ __name((v) => {
        enableOverride = v;
      }, "set")
    });
    if (typeof createDebug.init === "function") {
      createDebug.init(debug4);
    }
    return debug4;
  }
  __name(createDebug, "createDebug");
  function extend(namespace, delimiter) {
    const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
    newDebug.log = this.log;
    return newDebug;
  }
  __name(extend, "extend");
  function enable(namespaces) {
    createDebug.save(namespaces);
    createDebug.namespaces = namespaces;
    createDebug.names = [];
    createDebug.skips = [];
    const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
    for (const ns of split) {
      if (ns[0] === "-") {
        createDebug.skips.push(ns.slice(1));
      } else {
        createDebug.names.push(ns);
      }
    }
  }
  __name(enable, "enable");
  function matchesTemplate(search, template) {
    let searchIndex = 0;
    let templateIndex = 0;
    let starIndex = -1;
    let matchIndex = 0;
    while (searchIndex < search.length) {
      if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
        if (template[templateIndex] === "*") {
          starIndex = templateIndex;
          matchIndex = searchIndex;
          templateIndex++;
        } else {
          searchIndex++;
          templateIndex++;
        }
      } else if (starIndex !== -1) {
        templateIndex = starIndex + 1;
        matchIndex++;
        searchIndex = matchIndex;
      } else {
        return false;
      }
    }
    while (templateIndex < template.length && template[templateIndex] === "*") {
      templateIndex++;
    }
    return templateIndex === template.length;
  }
  __name(matchesTemplate, "matchesTemplate");
  function disable() {
    const namespaces = [
      ...createDebug.names,
      ...createDebug.skips.map((namespace) => "-" + namespace)
    ].join(",");
    createDebug.enable("");
    return namespaces;
  }
  __name(disable, "disable");
  function enabled(name) {
    for (const skip of createDebug.skips) {
      if (matchesTemplate(name, skip)) {
        return false;
      }
    }
    for (const ns of createDebug.names) {
      if (matchesTemplate(name, ns)) {
        return true;
      }
    }
    return false;
  }
  __name(enabled, "enabled");
  function coerce(val) {
    if (val instanceof Error) {
      return val.stack || val.message;
    }
    return val;
  }
  __name(coerce, "coerce");
  function destroy2() {
    console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  }
  __name(destroy2, "destroy2");
  createDebug.enable(createDebug.load());
  return createDebug;
}
__name(setup, "setup");
var common = setup;
var browser$1 = createCommonjsModule(function(module, exports) {
  exports.formatArgs = formatArgs2;
  exports.save = save2;
  exports.load = load2;
  exports.useColors = useColors2;
  exports.storage = localstorage();
  exports.destroy = /* @__PURE__ */ (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors2() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
      return true;
    }
    if (typeof navigator !== "undefined" && "Cloudflare-Workers" && "Cloudflare-Workers".toLowerCase().match(/(edge|trident)\/(\d+)/)) {
      return false;
    }
    let m2;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && "Cloudflare-Workers" && (m2 = "Cloudflare-Workers".toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m2[1], 10) >= 31 || typeof navigator !== "undefined" && "Cloudflare-Workers" && "Cloudflare-Workers".toLowerCase().match(/applewebkit\/(\d+)/);
  }
  __name(useColors2, "useColors2");
  function formatArgs2(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
    if (!this.useColors) {
      return;
    }
    const c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match2) => {
      if (match2 === "%%") {
        return;
      }
      index++;
      if (match2 === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  __name(formatArgs2, "formatArgs2");
  exports.log = console.debug || console.log || (() => {
  });
  function save2(namespaces) {
    try {
      if (namespaces) {
        exports.storage.setItem("debug", namespaces);
      } else {
        exports.storage.removeItem("debug");
      }
    } catch (error) {
    }
  }
  __name(save2, "save2");
  function load2() {
    let r;
    try {
      r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
    } catch (error) {
    }
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  __name(load2, "load2");
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {
    }
  }
  __name(localstorage, "localstorage");
  module.exports = common(exports);
  const { formatters } = module.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});
browser$1.colors;
browser$1.destroy;
browser$1.formatArgs;
browser$1.load;
browser$1.log;
browser$1.save;
browser$1.storage;
browser$1.useColors;
var itrToStream = /* @__PURE__ */ __name((itr) => {
  const it = itr[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const chunk = await it.next();
      if (chunk.done) controller.close();
      else controller.enqueue(chunk.value);
    }
  });
}, "itrToStream");
var baseFetchConfig = /* @__PURE__ */ __name((_apiRoot) => ({
  duplex: "half"
}), "baseFetchConfig");
var defaultAdapter = "cloudflare";
var debug = browser$1("grammy:warn");
var GrammyError = class extends Error {
  static {
    __name(this, "GrammyError");
  }
  method;
  payload;
  ok;
  error_code;
  description;
  parameters;
  constructor(message, err, method, payload) {
    super(`${message} (${err.error_code}: ${err.description})`);
    this.method = method;
    this.payload = payload;
    this.ok = false;
    this.name = "GrammyError";
    this.error_code = err.error_code;
    this.description = err.description;
    this.parameters = err.parameters ?? {};
  }
};
function toGrammyError(err, method, payload) {
  switch (err.error_code) {
    case 401:
      debug("Error 401 means that your bot token is wrong, talk to https://t.me/BotFather to check it.");
      break;
    case 409:
      debug("Error 409 means that you are running your bot several times on long polling. Consider revoking the bot token if you believe that no other instance is running.");
      break;
  }
  return new GrammyError(`Call to '${method}' failed!`, err, method, payload);
}
__name(toGrammyError, "toGrammyError");
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  error;
  constructor(message, error) {
    super(message);
    this.error = error;
    this.name = "HttpError";
  }
};
function isTelegramError(err) {
  return typeof err === "object" && err !== null && "status" in err && "statusText" in err;
}
__name(isTelegramError, "isTelegramError");
function toHttpError(method, sensitiveLogs, err) {
  let msg = `Network request for '${method}' failed!`;
  if (isTelegramError(err)) msg += ` (${err.status}: ${err.statusText})`;
  if (sensitiveLogs && err instanceof Error) msg += ` ${err.message}`;
  return new HttpError(msg, err);
}
__name(toHttpError, "toHttpError");
function checkWindows() {
  const global = globalThis;
  const platform2 = global.process?.platform;
  if (typeof platform2 === "string") return platform2.startsWith("win");
  const os = global.Deno?.build?.os;
  if (typeof os === "string") return os === "windows";
  return global.navigator?.platform?.startsWith("Win") ?? false;
}
__name(checkWindows, "checkWindows");
var isWindows = checkWindows();
function assertPath(path) {
  if (typeof path !== "string") {
    throw new TypeError(`Path must be a string, received "${JSON.stringify(path)}"`);
  }
}
__name(assertPath, "assertPath");
function stripSuffix(name, suffix) {
  if (suffix.length >= name.length) {
    return name;
  }
  const lenDiff = name.length - suffix.length;
  for (let i = suffix.length - 1; i >= 0; --i) {
    if (name.charCodeAt(lenDiff + i) !== suffix.charCodeAt(i)) {
      return name;
    }
  }
  return name.slice(0, -suffix.length);
}
__name(stripSuffix, "stripSuffix");
function lastPathSegment(path, isSep, start = 0) {
  let matchedNonSeparator = false;
  let end = path.length;
  for (let i = path.length - 1; i >= start; --i) {
    if (isSep(path.charCodeAt(i))) {
      if (matchedNonSeparator) {
        start = i + 1;
        break;
      }
    } else if (!matchedNonSeparator) {
      matchedNonSeparator = true;
      end = i + 1;
    }
  }
  return path.slice(start, end);
}
__name(lastPathSegment, "lastPathSegment");
function assertArgs(path, suffix) {
  assertPath(path);
  if (path.length === 0) return path;
  if (typeof suffix !== "string") {
    throw new TypeError(`Suffix must be a string, received "${JSON.stringify(suffix)}"`);
  }
}
__name(assertArgs, "assertArgs");
function assertArg(url) {
  url = url instanceof URL ? url : new URL(url);
  if (url.protocol !== "file:") {
    throw new TypeError(`URL must be a file URL: received "${url.protocol}"`);
  }
  return url;
}
__name(assertArg, "assertArg");
function fromFileUrl(url) {
  url = assertArg(url);
  return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
__name(fromFileUrl, "fromFileUrl");
function stripTrailingSeparators(segment, isSep) {
  if (segment.length <= 1) {
    return segment;
  }
  let end = segment.length;
  for (let i = segment.length - 1; i > 0; i--) {
    if (isSep(segment.charCodeAt(i))) {
      end = i;
    } else {
      break;
    }
  }
  return segment.slice(0, end);
}
__name(stripTrailingSeparators, "stripTrailingSeparators");
function isPosixPathSeparator(code) {
  return code === 47;
}
__name(isPosixPathSeparator, "isPosixPathSeparator");
function basename(path, suffix = "") {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertArgs(path, suffix);
  const lastSegment = lastPathSegment(path, isPosixPathSeparator);
  const strippedSegment = stripTrailingSeparators(lastSegment, isPosixPathSeparator);
  return suffix ? stripSuffix(strippedSegment, suffix) : strippedSegment;
}
__name(basename, "basename");
function isPathSeparator(code) {
  return code === 47 || code === 92;
}
__name(isPathSeparator, "isPathSeparator");
function isWindowsDeviceRoot(code) {
  return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}
__name(isWindowsDeviceRoot, "isWindowsDeviceRoot");
function fromFileUrl1(url) {
  url = assertArg(url);
  let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
  if (url.hostname !== "") {
    path = `\\\\${url.hostname}${path}`;
  }
  return path;
}
__name(fromFileUrl1, "fromFileUrl1");
function basename1(path, suffix = "") {
  if (path instanceof URL) {
    path = fromFileUrl1(path);
  }
  assertArgs(path, suffix);
  let start = 0;
  if (path.length >= 2) {
    const drive = path.charCodeAt(0);
    if (isWindowsDeviceRoot(drive)) {
      if (path.charCodeAt(1) === 58) start = 2;
    }
  }
  const lastSegment = lastPathSegment(path, isPathSeparator, start);
  const strippedSegment = stripTrailingSeparators(lastSegment, isPathSeparator);
  return suffix ? stripSuffix(strippedSegment, suffix) : strippedSegment;
}
__name(basename1, "basename1");
function basename2(path, suffix = "") {
  return isWindows ? basename1(path, suffix) : basename(path, suffix);
}
__name(basename2, "basename2");
var InputFile = class {
  static {
    __name(this, "InputFile");
  }
  consumed = false;
  fileData;
  filename;
  constructor(file, filename) {
    this.fileData = file;
    filename ??= this.guessFilename(file);
    this.filename = filename;
  }
  guessFilename(file) {
    if (typeof file === "string") return basename2(file);
    if (typeof file !== "object") return void 0;
    if ("url" in file) return basename2(file.url);
    if (!(file instanceof URL)) return void 0;
    return basename2(file.pathname) || basename2(file.hostname);
  }
  toRaw() {
    if (this.consumed) {
      throw new Error("Cannot reuse InputFile data source!");
    }
    const data = this.fileData;
    if (data instanceof Blob) return data.stream();
    if (data instanceof Response) {
      if (!data.ok) {
        throw new Error(`Cannot upload response with HTTP status ${data.status}!`);
      }
      if (data.body === null) throw new Error(`No response body!`);
      this.consumed = true;
      return data.body;
    }
    if (data instanceof URL) return fetchFile(data);
    if ("url" in data) return fetchFile(data.url);
    if (!(data instanceof Uint8Array)) this.consumed = true;
    return data;
  }
  toJSON() {
    throw new Error("InputFile instances must be sent via grammY");
  }
};
async function* fetchFile(url) {
  const controller = new AbortController();
  const { ok: ok2, status, body } = await fetch(url, {
    signal: controller.signal
  });
  if (!ok2) {
    controller.abort();
    throw new Error(`Download failed, received HTTP status ${status} from '${url}'`);
  }
  if (body === null) {
    throw new Error(`Download failed, no response body from '${url}'`);
  }
  yield* body;
}
__name(fetchFile, "fetchFile");
function requiresFormDataUpload(payload) {
  return payload instanceof InputFile || typeof payload === "object" && payload !== null && Object.values(payload).some((v) => Array.isArray(v) ? v.some(requiresFormDataUpload) : v instanceof InputFile || requiresFormDataUpload(v));
}
__name(requiresFormDataUpload, "requiresFormDataUpload");
function str(value) {
  return JSON.stringify(value, (_, v) => v ?? void 0);
}
__name(str, "str");
function createJsonPayload(payload) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      connection: "keep-alive"
    },
    body: str(payload)
  };
}
__name(createJsonPayload, "createJsonPayload");
async function* protectItr(itr, onError) {
  try {
    yield* itr;
  } catch (err) {
    onError(err);
  }
}
__name(protectItr, "protectItr");
function createFormDataPayload(payload, onError) {
  const boundary = createBoundary();
  const itr = payloadToMultipartItr(payload, boundary);
  const safeItr = protectItr(itr, onError);
  const stream = itrToStream(safeItr);
  return {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      connection: "keep-alive"
    },
    body: stream
  };
}
__name(createFormDataPayload, "createFormDataPayload");
function createBoundary() {
  return "----------" + randomId(32);
}
__name(createBoundary, "createBoundary");
function randomId(length = 16) {
  return Array.from(Array(length)).map(() => Math.random().toString(36)[2] || 0).join("");
}
__name(randomId, "randomId");
var enc = new TextEncoder();
async function* payloadToMultipartItr(payload, boundary) {
  const files = collectFiles(payload);
  yield enc.encode(`--${boundary}\r
`);
  const separator = enc.encode(`\r
--${boundary}\r
`);
  let first = true;
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (!first) yield separator;
    yield valuePart(key, value instanceof InputFile ? value.toJSON() : typeof value === "object" ? str(value) : value);
    first = false;
  }
  for (const { id, origin, file } of files) {
    if (!first) yield separator;
    yield* filePart(id, origin, file);
    first = false;
  }
  yield enc.encode(`\r
--${boundary}--\r
`);
}
__name(payloadToMultipartItr, "payloadToMultipartItr");
function collectFiles(value) {
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([k, v]) => {
    if (Array.isArray(v)) return v.flatMap((p) => collectFiles(p));
    else if (v instanceof InputFile) {
      const id = randomId();
      Object.assign(v, {
        toJSON: /* @__PURE__ */ __name(() => `attach://${id}`, "toJSON")
      });
      const origin = k === "media" && "type" in value && typeof value.type === "string" ? value.type : k;
      return {
        id,
        origin,
        file: v
      };
    } else return collectFiles(v);
  });
}
__name(collectFiles, "collectFiles");
function valuePart(key, value) {
  return enc.encode(`content-disposition:form-data;name="${key}"\r
\r
${value}`);
}
__name(valuePart, "valuePart");
async function* filePart(id, origin, input) {
  const filename = input.filename || `${origin}.${getExt(origin)}`;
  if (filename.includes("\r") || filename.includes("\n")) {
    throw new Error(`File paths cannot contain carriage-return (\\r) or newline (\\n) characters! Filename for property '${origin}' was:
"""
${filename}
"""`);
  }
  yield enc.encode(`content-disposition:form-data;name="${id}";filename=${filename}\r
content-type:application/octet-stream\r
\r
`);
  const data = await input.toRaw();
  if (data instanceof Uint8Array) yield data;
  else yield* data;
}
__name(filePart, "filePart");
function getExt(key) {
  switch (key) {
    case "certificate":
      return "pem";
    case "photo":
    case "thumbnail":
      return "jpg";
    case "voice":
      return "ogg";
    case "audio":
      return "mp3";
    case "animation":
    case "video":
    case "video_note":
      return "mp4";
    case "sticker":
      return "webp";
    default:
      return "dat";
  }
}
__name(getExt, "getExt");
var debug1 = browser$1("grammy:core");
function concatTransformer(prev, trans) {
  return (method, payload, signal) => trans(prev, method, payload, signal);
}
__name(concatTransformer, "concatTransformer");
var ApiClient = class {
  static {
    __name(this, "ApiClient");
  }
  token;
  webhookReplyEnvelope;
  options;
  fetch;
  hasUsedWebhookReply;
  installedTransformers;
  constructor(token, options = {}, webhookReplyEnvelope = {}) {
    this.token = token;
    this.webhookReplyEnvelope = webhookReplyEnvelope;
    this.hasUsedWebhookReply = false;
    this.installedTransformers = [];
    this.call = async (method, p, signal) => {
      const payload = p ?? {};
      debug1(`Calling ${method}`);
      if (signal !== void 0) validateSignal(method, payload, signal);
      const opts = this.options;
      const formDataRequired = requiresFormDataUpload(payload);
      if (this.webhookReplyEnvelope.send !== void 0 && !this.hasUsedWebhookReply && !formDataRequired && opts.canUseWebhookReply(method)) {
        this.hasUsedWebhookReply = true;
        const config3 = createJsonPayload({
          ...payload,
          method
        });
        await this.webhookReplyEnvelope.send(config3.body);
        return {
          ok: true,
          result: true
        };
      }
      const { controller, unregisterSignal } = createAbortControllerFromSignal(signal);
      const timeout = createTimeout(controller, opts.timeoutSeconds, method);
      const streamErr = createStreamError(controller);
      const url = opts.buildUrl(opts.apiRoot, this.token, method, opts.environment);
      const config2 = formDataRequired ? createFormDataPayload(payload, (err) => streamErr.catch(err)) : createJsonPayload(payload);
      const sig = controller.signal;
      const options2 = {
        ...opts.baseFetchConfig,
        signal: sig,
        ...config2
      };
      const successPromise = this.fetch(url, options2).then((res) => res.json());
      const operations = [
        successPromise,
        streamErr.promise,
        timeout.promise
      ];
      try {
        return await Promise.race(operations);
      } catch (error) {
        throw toHttpError(method, opts.sensitiveLogs, error);
      } finally {
        if (timeout.handle !== void 0) clearTimeout(timeout.handle);
        unregisterSignal?.();
      }
    };
    const apiRoot = options.apiRoot ?? "https://api.telegram.org";
    const environment = options.environment ?? "prod";
    const { fetch: customFetch } = options;
    const fetchFn = customFetch ?? fetch;
    this.options = {
      apiRoot,
      environment,
      buildUrl: options.buildUrl ?? defaultBuildUrl,
      timeoutSeconds: options.timeoutSeconds ?? 500,
      baseFetchConfig: {
        ...baseFetchConfig(apiRoot),
        ...options.baseFetchConfig
      },
      canUseWebhookReply: options.canUseWebhookReply ?? (() => false),
      sensitiveLogs: options.sensitiveLogs ?? false,
      fetch: /* @__PURE__ */ __name((...args) => fetchFn(...args), "fetch")
    };
    this.fetch = this.options.fetch;
    if (this.options.apiRoot.endsWith("/")) {
      throw new Error(`Remove the trailing '/' from the 'apiRoot' option (use '${this.options.apiRoot.substring(0, this.options.apiRoot.length - 1)}' instead of '${this.options.apiRoot}')`);
    }
  }
  call;
  use(...transformers) {
    this.call = transformers.reduce(concatTransformer, this.call);
    this.installedTransformers.push(...transformers);
    return this;
  }
  async callApi(method, payload, signal) {
    const data = await this.call(method, payload, signal);
    if (data.ok) return data.result;
    else throw toGrammyError(data, method, payload);
  }
};
var methodsWithoutPayload = {
  getMe: true,
  getWebhookInfo: true,
  getForumTopicIconStickers: true,
  getAvailableGifts: true,
  logOut: true,
  close: true,
  getMyStarBalance: true,
  removeMyProfilePhoto: true,
  getChatShareThemeBackdrops: true
};
function createRawApi(token, options, webhookReplyEnvelope) {
  const client = new ApiClient(token, options, webhookReplyEnvelope);
  const proxyHandler = {
    get(_, m2) {
      return m2 === "toJSON" ? "__internal" : Object.prototype.hasOwnProperty.call(methodsWithoutPayload, m2) ? client.callApi.bind(client, m2, {}) : client.callApi.bind(client, m2);
    },
    ...proxyMethods
  };
  const raw = new Proxy({}, proxyHandler);
  const installedTransformers = client.installedTransformers;
  const api = {
    raw,
    installedTransformers,
    use: /* @__PURE__ */ __name((...t) => {
      client.use(...t);
      return api;
    }, "use")
  };
  return api;
}
__name(createRawApi, "createRawApi");
var defaultBuildUrl = /* @__PURE__ */ __name((root, token, method, env) => {
  const prefix = env === "test" ? "test/" : "";
  return `${root}/bot${token}/${prefix}${method}`;
}, "defaultBuildUrl");
var proxyMethods = {
  set() {
    return false;
  },
  defineProperty() {
    return false;
  },
  deleteProperty() {
    return false;
  },
  ownKeys() {
    return [];
  }
};
function createTimeout(controller, seconds, method) {
  let handle = void 0;
  const promise = new Promise((_, reject) => {
    handle = setTimeout(() => {
      const msg = `Request to '${method}' timed out after ${seconds} seconds`;
      reject(new Error(msg));
      controller.abort();
    }, 1e3 * seconds);
  });
  return {
    promise,
    handle
  };
}
__name(createTimeout, "createTimeout");
function createStreamError(abortController) {
  let onError = /* @__PURE__ */ __name((err) => {
    throw err;
  }, "onError");
  const promise = new Promise((_, reject) => {
    onError = /* @__PURE__ */ __name((err) => {
      reject(err);
      abortController.abort();
    }, "onError");
  });
  return {
    promise,
    catch: onError
  };
}
__name(createStreamError, "createStreamError");
function createAbortControllerFromSignal(signal) {
  const controller = new AbortController();
  if (signal === void 0) {
    return {
      controller,
      unregisterSignal: void 0
    };
  }
  const sig = signal;
  function abort() {
    controller.abort();
    unregisterSignal();
  }
  __name(abort, "abort");
  function unregisterSignal() {
    sig.removeEventListener("abort", abort);
  }
  __name(unregisterSignal, "unregisterSignal");
  if (sig.aborted) abort();
  else sig.addEventListener("abort", abort);
  return {
    controller: {
      abort,
      signal: controller.signal
    },
    unregisterSignal
  };
}
__name(createAbortControllerFromSignal, "createAbortControllerFromSignal");
function validateSignal(method, payload, signal) {
  if (typeof signal?.addEventListener === "function") {
    return;
  }
  let payload0 = JSON.stringify(payload);
  if (payload0.length > 20) {
    payload0 = payload0.substring(0, 16) + " ...";
  }
  let payload1 = JSON.stringify(signal);
  if (payload1.length > 20) {
    payload1 = payload1.substring(0, 16) + " ...";
  }
  throw new Error(`Incorrect abort signal instance found! You passed two payloads to '${method}' but you should merge the second one containing '${payload1}' into the first one containing '${payload0}'! If you are using context shortcuts, you may want to use a method on 'ctx.api' instead.

If you want to prevent such mistakes in the future, consider using TypeScript. https://www.typescriptlang.org/`);
}
__name(validateSignal, "validateSignal");
var Api = class {
  static {
    __name(this, "Api");
  }
  token;
  options;
  raw;
  config;
  constructor(token, options, webhookReplyEnvelope) {
    this.token = token;
    this.options = options;
    const { raw, use, installedTransformers } = createRawApi(token, options, webhookReplyEnvelope);
    this.raw = raw;
    this.config = {
      use,
      installedTransformers: /* @__PURE__ */ __name(() => installedTransformers.slice(), "installedTransformers")
    };
  }
  getUpdates(other, signal) {
    return this.raw.getUpdates({
      ...other
    }, signal);
  }
  setWebhook(url, other, signal) {
    return this.raw.setWebhook({
      url,
      ...other
    }, signal);
  }
  deleteWebhook(other, signal) {
    return this.raw.deleteWebhook({
      ...other
    }, signal);
  }
  getWebhookInfo(signal) {
    return this.raw.getWebhookInfo(signal);
  }
  getMe(signal) {
    return this.raw.getMe(signal);
  }
  logOut(signal) {
    return this.raw.logOut(signal);
  }
  close(signal) {
    return this.raw.close(signal);
  }
  sendMessage(chat_id, text, other, signal) {
    return this.raw.sendMessage({
      chat_id,
      text,
      ...other
    }, signal);
  }
  sendMessageEphemeralForCallback(callback_query_id, text, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendMessage({
      text,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendRichMessage(chat_id, rich_message, other, signal) {
    return this.raw.sendRichMessage({
      chat_id,
      rich_message,
      ...other
    }, signal);
  }
  sendRichMessageEphemeralForCallback(callback_query_id, rich_message, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendRichMessage({
      rich_message,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  forwardMessage(chat_id, from_chat_id, message_id, other, signal) {
    return this.raw.forwardMessage({
      chat_id,
      from_chat_id,
      message_id,
      ...other
    }, signal);
  }
  forwardMessages(chat_id, from_chat_id, message_ids, other, signal) {
    return this.raw.forwardMessages({
      chat_id,
      from_chat_id,
      message_ids,
      ...other
    }, signal);
  }
  copyMessage(chat_id, from_chat_id, message_id, other, signal) {
    return this.raw.copyMessage({
      chat_id,
      from_chat_id,
      message_id,
      ...other
    }, signal);
  }
  copyMessages(chat_id, from_chat_id, message_ids, other, signal) {
    return this.raw.copyMessages({
      chat_id,
      from_chat_id,
      message_ids,
      ...other
    }, signal);
  }
  sendPhoto(chat_id, photo, other, signal) {
    return this.raw.sendPhoto({
      chat_id,
      photo,
      ...other
    }, signal);
  }
  sendPhotoEphemeralForCallback(callback_query_id, photo, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendPhoto({
      photo,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendLivePhoto(chat_id, live_photo, photo, other, signal) {
    return this.raw.sendLivePhoto({
      chat_id,
      live_photo,
      photo,
      ...other
    }, signal);
  }
  sendLivePhotoEphemeralForCallback(callback_query_id, live_photo, photo, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendLivePhoto({
      live_photo,
      photo,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendAudio(chat_id, audio, other, signal) {
    return this.raw.sendAudio({
      chat_id,
      audio,
      ...other
    }, signal);
  }
  sendAudioEphemeralForCallback(callback_query_id, audio, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendAudio({
      audio,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendDocument(chat_id, document1, other, signal) {
    return this.raw.sendDocument({
      chat_id,
      document: document1,
      ...other
    }, signal);
  }
  sendDocumentEphemeralForCallback(callback_query_id, document1, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendDocument({
      document: document1,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendVideo(chat_id, video, other, signal) {
    return this.raw.sendVideo({
      chat_id,
      video,
      ...other
    }, signal);
  }
  sendVideoEphemeralForCallback(callback_query_id, video, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendVideo({
      video,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendAnimation(chat_id, animation, other, signal) {
    return this.raw.sendAnimation({
      chat_id,
      animation,
      ...other
    }, signal);
  }
  sendAnimationEphemeralForCallback(callback_query_id, animation, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendAnimation({
      animation,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendVoice(chat_id, voice, other, signal) {
    return this.raw.sendVoice({
      chat_id,
      voice,
      ...other
    }, signal);
  }
  sendVoiceEphemeralForCallback(callback_query_id, voice, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendVoice({
      voice,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendVideoNote(chat_id, video_note, other, signal) {
    return this.raw.sendVideoNote({
      chat_id,
      video_note,
      ...other
    }, signal);
  }
  sendVideoNoteEphemeralForCallback(callback_query_id, video_note, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendVideoNote({
      video_note,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendWidget(chat_id, html, other, signal) {
    return this.raw.sendWidget({
      chat_id,
      html,
      ...other
    }, signal);
  }
  sendSharedWidget(chat_id, widget_id, other, signal) {
    return this.raw.sendSharedWidget({
      chat_id,
      widget_id,
      ...other
    }, signal);
  }
  sendPaidMedia(chat_id, star_count, media, other, signal) {
    return this.raw.sendPaidMedia({
      chat_id,
      star_count,
      media,
      ...other
    }, signal);
  }
  sendMediaGroup(chat_id, media, other, signal) {
    return this.raw.sendMediaGroup({
      chat_id,
      media,
      ...other
    }, signal);
  }
  sendLocation(chat_id, latitude, longitude, other, signal) {
    return this.raw.sendLocation({
      chat_id,
      latitude,
      longitude,
      ...other
    }, signal);
  }
  sendLocationEphemeralForCallback(callback_query_id, latitude, longitude, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendLocation({
      latitude,
      longitude,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  editMessageLiveLocation(chat_id, message_id, latitude, longitude, other, signal) {
    return this.raw.editMessageLiveLocation({
      chat_id,
      message_id,
      latitude,
      longitude,
      ...other
    }, signal);
  }
  editMessageLiveLocationInline(inline_message_id, latitude, longitude, other, signal) {
    return this.raw.editMessageLiveLocation({
      inline_message_id,
      latitude,
      longitude,
      ...other
    }, signal);
  }
  stopMessageLiveLocation(chat_id, message_id, other, signal) {
    return this.raw.stopMessageLiveLocation({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  stopMessageLiveLocationInline(inline_message_id, other, signal) {
    return this.raw.stopMessageLiveLocation({
      inline_message_id,
      ...other
    }, signal);
  }
  sendVenue(chat_id, latitude, longitude, title2, address, other, signal) {
    return this.raw.sendVenue({
      chat_id,
      latitude,
      longitude,
      title: title2,
      address,
      ...other
    }, signal);
  }
  sendVenueEphemeralForCallback(callback_query_id, latitude, longitude, title2, address, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendVenue({
      latitude,
      longitude,
      title: title2,
      address,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendContact(chat_id, phone_number, first_name, other, signal) {
    return this.raw.sendContact({
      chat_id,
      phone_number,
      first_name,
      ...other
    }, signal);
  }
  sendContactEphemeralForCallback(callback_query_id, phone_number, first_name, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendContact({
      phone_number,
      first_name,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  sendPoll(chat_id, question, options, other, signal) {
    const opts = options.map((o) => typeof o === "string" ? {
      text: o
    } : o);
    return this.raw.sendPoll({
      chat_id,
      question,
      options: opts,
      ...other
    }, signal);
  }
  sendChecklist(business_connection_id, chat_id, checklist, other, signal) {
    return this.raw.sendChecklist({
      business_connection_id,
      chat_id,
      checklist,
      ...other
    }, signal);
  }
  editMessageChecklist(business_connection_id, chat_id, message_id, checklist, other, signal) {
    return this.raw.editMessageChecklist({
      business_connection_id,
      chat_id,
      message_id,
      checklist,
      ...other
    }, signal);
  }
  sendDice(chat_id, emoji, other, signal) {
    return this.raw.sendDice({
      chat_id,
      emoji,
      ...other
    }, signal);
  }
  setMessageReaction(chat_id, message_id, reaction, other, signal) {
    return this.raw.setMessageReaction({
      chat_id,
      message_id,
      reaction,
      ...other
    }, signal);
  }
  sendMessageDraft(chat_id, draft_id, text, other, signal) {
    return this.raw.sendMessageDraft({
      chat_id,
      draft_id,
      text,
      ...other
    }, signal);
  }
  sendRichMessageDraft(chat_id, draft_id, rich_message, other, signal) {
    return this.raw.sendRichMessageDraft({
      chat_id,
      draft_id,
      rich_message,
      ...other
    }, signal);
  }
  sendChatAction(chat_id, action, other, signal) {
    return this.raw.sendChatAction({
      chat_id,
      action,
      ...other
    }, signal);
  }
  getUserProfilePhotos(user_id, other, signal) {
    return this.raw.getUserProfilePhotos({
      user_id,
      ...other
    }, signal);
  }
  getUserProfileAudios(user_id, other, signal) {
    return this.raw.getUserProfileAudios({
      user_id,
      ...other
    }, signal);
  }
  setUserEmojiStatus(user_id, other, signal) {
    return this.raw.setUserEmojiStatus({
      user_id,
      ...other
    }, signal);
  }
  getUserChatBoosts(chat_id, user_id, signal) {
    return this.raw.getUserChatBoosts({
      chat_id,
      user_id
    }, signal);
  }
  getUserGifts(user_id, other, signal) {
    return this.raw.getUserGifts({
      user_id,
      ...other
    }, signal);
  }
  getChatGifts(chat_id, other, signal) {
    return this.raw.getChatGifts({
      chat_id,
      ...other
    }, signal);
  }
  getUniqueGift(name, signal) {
    return this.raw.getUniqueGift({
      name
    }, signal);
  }
  getBusinessConnection(business_connection_id, signal) {
    return this.raw.getBusinessConnection({
      business_connection_id
    }, signal);
  }
  getManagedBotToken(user_id, signal) {
    return this.raw.getManagedBotToken({
      user_id
    }, signal);
  }
  replaceManagedBotToken(user_id, signal) {
    return this.raw.replaceManagedBotToken({
      user_id
    }, signal);
  }
  getManagedBotAccessSettings(user_id, signal) {
    return this.raw.getManagedBotAccessSettings({
      user_id
    }, signal);
  }
  setManagedBotAccessSettings(user_id, is_access_restricted, other, signal) {
    return this.raw.setManagedBotAccessSettings({
      user_id,
      is_access_restricted,
      ...other
    }, signal);
  }
  getFile(file_id, signal) {
    return this.raw.getFile({
      file_id
    }, signal);
  }
  kickChatMember(...args) {
    return this.banChatMember(...args);
  }
  banChatMember(chat_id, user_id, other, signal) {
    return this.raw.banChatMember({
      chat_id,
      user_id,
      ...other
    }, signal);
  }
  unbanChatMember(chat_id, user_id, other, signal) {
    return this.raw.unbanChatMember({
      chat_id,
      user_id,
      ...other
    }, signal);
  }
  restrictChatMember(chat_id, user_id, permissions, other, signal) {
    return this.raw.restrictChatMember({
      chat_id,
      user_id,
      permissions,
      ...other
    }, signal);
  }
  promoteChatMember(chat_id, user_id, other, signal) {
    return this.raw.promoteChatMember({
      chat_id,
      user_id,
      ...other
    }, signal);
  }
  setChatAdministratorCustomTitle(chat_id, user_id, custom_title, signal) {
    return this.raw.setChatAdministratorCustomTitle({
      chat_id,
      user_id,
      custom_title
    }, signal);
  }
  setChatMemberTag(chat_id, user_id, tag, signal) {
    return this.raw.setChatMemberTag({
      chat_id,
      user_id,
      tag
    }, signal);
  }
  banChatSenderChat(chat_id, sender_chat_id, signal) {
    return this.raw.banChatSenderChat({
      chat_id,
      sender_chat_id
    }, signal);
  }
  unbanChatSenderChat(chat_id, sender_chat_id, signal) {
    return this.raw.unbanChatSenderChat({
      chat_id,
      sender_chat_id
    }, signal);
  }
  setChatPermissions(chat_id, permissions, other, signal) {
    return this.raw.setChatPermissions({
      chat_id,
      permissions,
      ...other
    }, signal);
  }
  exportChatInviteLink(chat_id, signal) {
    return this.raw.exportChatInviteLink({
      chat_id
    }, signal);
  }
  createChatInviteLink(chat_id, other, signal) {
    return this.raw.createChatInviteLink({
      chat_id,
      ...other
    }, signal);
  }
  editChatInviteLink(chat_id, invite_link, other, signal) {
    return this.raw.editChatInviteLink({
      chat_id,
      invite_link,
      ...other
    }, signal);
  }
  createChatSubscriptionInviteLink(chat_id, subscription_period, subscription_price, other, signal) {
    return this.raw.createChatSubscriptionInviteLink({
      chat_id,
      subscription_period,
      subscription_price,
      ...other
    }, signal);
  }
  editChatSubscriptionInviteLink(chat_id, invite_link, other, signal) {
    return this.raw.editChatSubscriptionInviteLink({
      chat_id,
      invite_link,
      ...other
    }, signal);
  }
  revokeChatInviteLink(chat_id, invite_link, signal) {
    return this.raw.revokeChatInviteLink({
      chat_id,
      invite_link
    }, signal);
  }
  approveChatJoinRequest(chat_id, user_id, signal) {
    return this.raw.approveChatJoinRequest({
      chat_id,
      user_id
    }, signal);
  }
  declineChatJoinRequest(chat_id, user_id, signal) {
    return this.raw.declineChatJoinRequest({
      chat_id,
      user_id
    }, signal);
  }
  answerChatJoinRequestQuery(chat_join_request_query_id, result, signal) {
    return this.raw.answerChatJoinRequestQuery({
      chat_join_request_query_id,
      result
    }, signal);
  }
  sendChatJoinRequestWebApp(chat_join_request_query_id, web_app_url, signal) {
    return this.raw.sendChatJoinRequestWebApp({
      chat_join_request_query_id,
      web_app_url
    }, signal);
  }
  approveSuggestedPost(chat_id, message_id, other, signal) {
    return this.raw.approveSuggestedPost({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  declineSuggestedPost(chat_id, message_id, other, signal) {
    return this.raw.declineSuggestedPost({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  setChatPhoto(chat_id, photo, signal) {
    return this.raw.setChatPhoto({
      chat_id,
      photo
    }, signal);
  }
  deleteChatPhoto(chat_id, signal) {
    return this.raw.deleteChatPhoto({
      chat_id
    }, signal);
  }
  setChatTitle(chat_id, title2, signal) {
    return this.raw.setChatTitle({
      chat_id,
      title: title2
    }, signal);
  }
  setChatDescription(chat_id, description, signal) {
    return this.raw.setChatDescription({
      chat_id,
      description
    }, signal);
  }
  pinChatMessage(chat_id, message_id, other, signal) {
    return this.raw.pinChatMessage({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  unpinChatMessage(chat_id, message_id, other, signal) {
    return this.raw.unpinChatMessage({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  unpinAllChatMessages(chat_id, signal) {
    return this.raw.unpinAllChatMessages({
      chat_id
    }, signal);
  }
  leaveChat(chat_id, signal) {
    return this.raw.leaveChat({
      chat_id
    }, signal);
  }
  getChat(chat_id, signal) {
    return this.raw.getChat({
      chat_id
    }, signal);
  }
  getChatAdministrators(chat_id, other, signal) {
    return this.raw.getChatAdministrators({
      chat_id,
      ...other
    }, signal);
  }
  getChatMembersCount(...args) {
    return this.getChatMemberCount(...args);
  }
  getChatMemberCount(chat_id, signal) {
    return this.raw.getChatMemberCount({
      chat_id
    }, signal);
  }
  getChatMember(chat_id, user_id, signal) {
    return this.raw.getChatMember({
      chat_id,
      user_id
    }, signal);
  }
  getChatShareThemeBackdrops(signal) {
    return this.raw.getChatShareThemeBackdrops(signal);
  }
  getUserPersonalChatMessages(user_id, limit, signal) {
    return this.raw.getUserPersonalChatMessages({
      user_id,
      limit
    }, signal);
  }
  setChatStickerSet(chat_id, sticker_set_name, signal) {
    return this.raw.setChatStickerSet({
      chat_id,
      sticker_set_name
    }, signal);
  }
  deleteChatStickerSet(chat_id, signal) {
    return this.raw.deleteChatStickerSet({
      chat_id
    }, signal);
  }
  getForumTopicIconStickers(signal) {
    return this.raw.getForumTopicIconStickers(signal);
  }
  createForumTopic(chat_id, name, other, signal) {
    return this.raw.createForumTopic({
      chat_id,
      name,
      ...other
    }, signal);
  }
  editForumTopic(chat_id, message_thread_id, other, signal) {
    return this.raw.editForumTopic({
      chat_id,
      message_thread_id,
      ...other
    }, signal);
  }
  closeForumTopic(chat_id, message_thread_id, signal) {
    return this.raw.closeForumTopic({
      chat_id,
      message_thread_id
    }, signal);
  }
  reopenForumTopic(chat_id, message_thread_id, signal) {
    return this.raw.reopenForumTopic({
      chat_id,
      message_thread_id
    }, signal);
  }
  deleteForumTopic(chat_id, message_thread_id, signal) {
    return this.raw.deleteForumTopic({
      chat_id,
      message_thread_id
    }, signal);
  }
  unpinAllForumTopicMessages(chat_id, message_thread_id, signal) {
    return this.raw.unpinAllForumTopicMessages({
      chat_id,
      message_thread_id
    }, signal);
  }
  editGeneralForumTopic(chat_id, name, signal) {
    return this.raw.editGeneralForumTopic({
      chat_id,
      name
    }, signal);
  }
  closeGeneralForumTopic(chat_id, signal) {
    return this.raw.closeGeneralForumTopic({
      chat_id
    }, signal);
  }
  reopenGeneralForumTopic(chat_id, signal) {
    return this.raw.reopenGeneralForumTopic({
      chat_id
    }, signal);
  }
  hideGeneralForumTopic(chat_id, signal) {
    return this.raw.hideGeneralForumTopic({
      chat_id
    }, signal);
  }
  unhideGeneralForumTopic(chat_id, signal) {
    return this.raw.unhideGeneralForumTopic({
      chat_id
    }, signal);
  }
  unpinAllGeneralForumTopicMessages(chat_id, signal) {
    return this.raw.unpinAllGeneralForumTopicMessages({
      chat_id
    }, signal);
  }
  answerCallbackQuery(callback_query_id, other, signal) {
    return this.raw.answerCallbackQuery({
      callback_query_id,
      ...other
    }, signal);
  }
  answerWidgetQuery(widget_query_id, other, signal) {
    return this.raw.answerWidgetQuery({
      widget_query_id,
      ...other
    }, signal);
  }
  answerGuestQuery(guest_query_id, result, signal) {
    return this.raw.answerGuestQuery({
      guest_query_id,
      result
    }, signal);
  }
  setMyName(name, other, signal) {
    return this.raw.setMyName({
      name,
      ...other
    }, signal);
  }
  getMyName(other, signal) {
    return this.raw.getMyName(other ?? {}, signal);
  }
  setMyCommands(commands, other, signal) {
    return this.raw.setMyCommands({
      commands,
      ...other
    }, signal);
  }
  deleteMyCommands(other, signal) {
    return this.raw.deleteMyCommands({
      ...other
    }, signal);
  }
  getMyCommands(other, signal) {
    return this.raw.getMyCommands({
      ...other
    }, signal);
  }
  setMyDescription(description, other, signal) {
    return this.raw.setMyDescription({
      description,
      ...other
    }, signal);
  }
  getMyDescription(other, signal) {
    return this.raw.getMyDescription({
      ...other
    }, signal);
  }
  setMyShortDescription(short_description, other, signal) {
    return this.raw.setMyShortDescription({
      short_description,
      ...other
    }, signal);
  }
  getMyShortDescription(other, signal) {
    return this.raw.getMyShortDescription({
      ...other
    }, signal);
  }
  setMyProfilePhoto(photo, signal) {
    return this.raw.setMyProfilePhoto({
      photo
    }, signal);
  }
  setMySettings(other, signal) {
    return this.raw.setMySettings({
      ...other
    }, signal);
  }
  removeMyProfilePhoto(signal) {
    return this.raw.removeMyProfilePhoto(signal);
  }
  setChatMenuButton(other, signal) {
    return this.raw.setChatMenuButton({
      ...other
    }, signal);
  }
  getChatMenuButton(other, signal) {
    return this.raw.getChatMenuButton({
      ...other
    }, signal);
  }
  setMyDefaultAdministratorRights(other, signal) {
    return this.raw.setMyDefaultAdministratorRights({
      ...other
    }, signal);
  }
  getMyDefaultAdministratorRights(other, signal) {
    return this.raw.getMyDefaultAdministratorRights({
      ...other
    }, signal);
  }
  getMyStarBalance(signal) {
    return this.raw.getMyStarBalance(signal);
  }
  editMessageText(chat_id, message_id, text_or_rich_message, other, signal) {
    return this.raw.editMessageText(typeof text_or_rich_message === "string" ? {
      chat_id,
      message_id,
      text: text_or_rich_message,
      ...other
    } : {
      chat_id,
      message_id,
      rich_message: text_or_rich_message,
      ...other
    }, signal);
  }
  editMessageTextInline(inline_message_id, text_or_rich_message, other, signal) {
    return this.raw.editMessageText(typeof text_or_rich_message === "string" ? {
      inline_message_id,
      text: text_or_rich_message,
      ...other
    } : {
      inline_message_id,
      rich_message: text_or_rich_message,
      ...other
    }, signal);
  }
  editMessageCaption(chat_id, message_id, other, signal) {
    return this.raw.editMessageCaption({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  editMessageCaptionInline(inline_message_id, other, signal) {
    return this.raw.editMessageCaption({
      inline_message_id,
      ...other
    }, signal);
  }
  editMessageMedia(chat_id, message_id, media, other, signal) {
    return this.raw.editMessageMedia({
      chat_id,
      message_id,
      media,
      ...other
    }, signal);
  }
  editMessageMediaInline(inline_message_id, media, other, signal) {
    return this.raw.editMessageMedia({
      inline_message_id,
      media,
      ...other
    }, signal);
  }
  editMessageWidgetData(chat_id, message_id, other, signal) {
    return this.raw.editMessageWidgetData({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  editMessageWidgetDataInline(inline_message_id, other, signal) {
    return this.raw.editMessageWidgetData({
      inline_message_id,
      ...other
    }, signal);
  }
  editSharedWidgetData(widget_id, public_data, other, signal) {
    return this.raw.editSharedWidgetData({
      widget_id,
      public_data,
      ...other
    }, signal);
  }
  editMessageReplyMarkup(chat_id, message_id, other, signal) {
    return this.raw.editMessageReplyMarkup({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  editMessageReplyMarkupInline(inline_message_id, other, signal) {
    return this.raw.editMessageReplyMarkup({
      inline_message_id,
      ...other
    }, signal);
  }
  stopPoll(chat_id, message_id, other, signal) {
    return this.raw.stopPoll({
      chat_id,
      message_id,
      ...other
    }, signal);
  }
  editEphemeralMessageText(chat_id, receiver_user_id, ephemeral_message_id, text_or_rich_message, other, signal) {
    return this.raw.editEphemeralMessageText(typeof text_or_rich_message === "string" ? {
      chat_id,
      receiver_user_id,
      ephemeral_message_id,
      text: text_or_rich_message,
      ...other
    } : {
      chat_id,
      receiver_user_id,
      ephemeral_message_id,
      rich_message: text_or_rich_message,
      ...other
    }, signal);
  }
  editEphemeralMessageMedia(chat_id, receiver_user_id, ephemeral_message_id, media, other, signal) {
    return this.raw.editEphemeralMessageMedia({
      chat_id,
      receiver_user_id,
      ephemeral_message_id,
      media,
      ...other
    }, signal);
  }
  editEphemeralMessageCaption(chat_id, receiver_user_id, ephemeral_message_id, caption, other, signal) {
    return this.raw.editEphemeralMessageCaption({
      chat_id,
      receiver_user_id,
      ephemeral_message_id,
      caption,
      ...other
    }, signal);
  }
  editEphemeralMessageReplyMarkup(chat_id, receiver_user_id, ephemeral_message_id, other, signal) {
    return this.raw.editEphemeralMessageReplyMarkup({
      chat_id,
      receiver_user_id,
      ephemeral_message_id,
      ...other
    }, signal);
  }
  deleteMessage(chat_id, message_id, signal) {
    return this.raw.deleteMessage({
      chat_id,
      message_id
    }, signal);
  }
  deleteMessages(chat_id, message_ids, signal) {
    return this.raw.deleteMessages({
      chat_id,
      message_ids
    }, signal);
  }
  deleteEphemeralMessage(chat_id, receiver_user_id, ephemeral_message_id, signal) {
    return this.raw.deleteEphemeralMessage({
      chat_id,
      receiver_user_id,
      ephemeral_message_id
    }, signal);
  }
  deleteMessageReactionUser(chat_id, message_id, user_id, other, signal) {
    return this.raw.deleteMessageReaction({
      chat_id,
      message_id,
      user_id,
      ...other
    }, signal);
  }
  deleteMessageReactionChat(chat_id, message_id, actor_chat_id, other, signal) {
    return this.raw.deleteMessageReaction({
      chat_id,
      message_id,
      actor_chat_id,
      ...other
    }, signal);
  }
  deleteAllMessageReactionsUser(chat_id, user_id, other, signal) {
    return this.raw.deleteAllMessageReactions({
      chat_id,
      user_id,
      ...other
    }, signal);
  }
  deleteAllMessageReactionsChat(chat_id, actor_chat_id, other, signal) {
    return this.raw.deleteAllMessageReactions({
      chat_id,
      actor_chat_id,
      ...other
    }, signal);
  }
  deleteBusinessMessages(business_connection_id, message_ids, signal) {
    return this.raw.deleteBusinessMessages({
      business_connection_id,
      message_ids
    }, signal);
  }
  setBusinessAccountName(business_connection_id, first_name, other, signal) {
    return this.raw.setBusinessAccountName({
      business_connection_id,
      first_name,
      ...other
    }, signal);
  }
  setBusinessAccountUsername(business_connection_id, username, signal) {
    return this.raw.setBusinessAccountUsername({
      business_connection_id,
      username
    }, signal);
  }
  setBusinessAccountBio(business_connection_id, bio, signal) {
    return this.raw.setBusinessAccountBio({
      business_connection_id,
      bio
    }, signal);
  }
  setBusinessAccountProfilePhoto(business_connection_id, photo, other, signal) {
    return this.raw.setBusinessAccountProfilePhoto({
      business_connection_id,
      photo,
      ...other
    }, signal);
  }
  removeBusinessAccountProfilePhoto(business_connection_id, other, signal) {
    return this.raw.removeBusinessAccountProfilePhoto({
      business_connection_id,
      ...other
    }, signal);
  }
  setBusinessAccountGiftSettings(business_connection_id, show_gift_button, accepted_gift_types, signal) {
    return this.raw.setBusinessAccountGiftSettings({
      business_connection_id,
      show_gift_button,
      accepted_gift_types
    }, signal);
  }
  getBusinessAccountStarBalance(business_connection_id, signal) {
    return this.raw.getBusinessAccountStarBalance({
      business_connection_id
    }, signal);
  }
  transferBusinessAccountStars(business_connection_id, star_count, signal) {
    return this.raw.transferBusinessAccountStars({
      business_connection_id,
      star_count
    }, signal);
  }
  getBusinessAccountGifts(business_connection_id, other, signal) {
    return this.raw.getBusinessAccountGifts({
      business_connection_id,
      ...other
    }, signal);
  }
  convertGiftToStars(business_connection_id, owned_gift_id, signal) {
    return this.raw.convertGiftToStars({
      business_connection_id,
      owned_gift_id
    }, signal);
  }
  upgradeGift(business_connection_id, owned_gift_id, other, signal) {
    return this.raw.upgradeGift({
      business_connection_id,
      owned_gift_id,
      ...other
    }, signal);
  }
  transferGift(business_connection_id, owned_gift_id, new_owner_chat_id, star_count, signal) {
    return this.raw.transferGift({
      business_connection_id,
      owned_gift_id,
      new_owner_chat_id,
      star_count
    }, signal);
  }
  deleteBusinessAccountGift(business_connection_id, owned_gift_id, signal) {
    return this.raw.deleteBusinessAccountGift({
      business_connection_id,
      owned_gift_id
    }, signal);
  }
  postStory(business_connection_id, content, active_period, other, signal) {
    return this.raw.postStory({
      business_connection_id,
      content,
      active_period,
      ...other
    }, signal);
  }
  repostStory(business_connection_id, from_chat_id, from_story_id, active_period, other, signal) {
    return this.raw.repostStory({
      business_connection_id,
      from_chat_id,
      from_story_id,
      active_period,
      ...other
    }, signal);
  }
  editStory(business_connection_id, story_id, content, other, signal) {
    return this.raw.editStory({
      business_connection_id,
      story_id,
      content,
      ...other
    }, signal);
  }
  deleteStory(business_connection_id, story_id, signal) {
    return this.raw.deleteStory({
      business_connection_id,
      story_id
    }, signal);
  }
  sendSticker(chat_id, sticker, other, signal) {
    return this.raw.sendSticker({
      chat_id,
      sticker,
      ...other
    }, signal);
  }
  sendStickerEphemeralForCallback(callback_query_id, sticker, other, signal) {
    const ephemeral_message_parameters = {
      callback_query_id,
      ...other?.ephemeral_message_parameters ?? {}
    };
    return this.raw.sendSticker({
      sticker,
      ...other,
      ephemeral_message_parameters
    }, signal);
  }
  getStickerSet(name, signal) {
    return this.raw.getStickerSet({
      name
    }, signal);
  }
  getCustomEmojiStickers(custom_emoji_ids, signal) {
    return this.raw.getCustomEmojiStickers({
      custom_emoji_ids
    }, signal);
  }
  uploadStickerFile(user_id, sticker_format, sticker, signal) {
    return this.raw.uploadStickerFile({
      user_id,
      sticker_format,
      sticker
    }, signal);
  }
  createNewStickerSet(user_id, name, title2, stickers, other, signal) {
    return this.raw.createNewStickerSet({
      user_id,
      name,
      title: title2,
      stickers,
      ...other
    }, signal);
  }
  addStickerToSet(user_id, name, sticker, signal) {
    return this.raw.addStickerToSet({
      user_id,
      name,
      sticker
    }, signal);
  }
  setStickerPositionInSet(sticker, position, signal) {
    return this.raw.setStickerPositionInSet({
      sticker,
      position
    }, signal);
  }
  deleteStickerFromSet(sticker, signal) {
    return this.raw.deleteStickerFromSet({
      sticker
    }, signal);
  }
  replaceStickerInSet(user_id, name, old_sticker, sticker, signal) {
    return this.raw.replaceStickerInSet({
      user_id,
      name,
      old_sticker,
      sticker
    }, signal);
  }
  setStickerEmojiList(sticker, emoji_list, signal) {
    return this.raw.setStickerEmojiList({
      sticker,
      emoji_list
    }, signal);
  }
  setStickerKeywords(sticker, keywords, signal) {
    return this.raw.setStickerKeywords({
      sticker,
      keywords
    }, signal);
  }
  setStickerMaskPosition(sticker, mask_position, signal) {
    return this.raw.setStickerMaskPosition({
      sticker,
      mask_position
    }, signal);
  }
  setStickerSetTitle(name, title2, signal) {
    return this.raw.setStickerSetTitle({
      name,
      title: title2
    }, signal);
  }
  deleteStickerSet(name, signal) {
    return this.raw.deleteStickerSet({
      name
    }, signal);
  }
  setStickerSetThumbnail(name, user_id, thumbnail, format, signal) {
    return this.raw.setStickerSetThumbnail({
      name,
      user_id,
      thumbnail,
      format
    }, signal);
  }
  setCustomEmojiStickerSetThumbnail(name, custom_emoji_id, signal) {
    return this.raw.setCustomEmojiStickerSetThumbnail({
      name,
      custom_emoji_id
    }, signal);
  }
  getAvailableGifts(signal) {
    return this.raw.getAvailableGifts(signal);
  }
  sendGift(user_id, gift_id, other, signal) {
    return this.raw.sendGift({
      user_id,
      gift_id,
      ...other
    }, signal);
  }
  giftPremiumSubscription(user_id, month_count, star_count, other, signal) {
    return this.raw.giftPremiumSubscription({
      user_id,
      month_count,
      star_count,
      ...other
    }, signal);
  }
  sendGiftToChannel(chat_id, gift_id, other, signal) {
    return this.raw.sendGift({
      chat_id,
      gift_id,
      ...other
    }, signal);
  }
  answerInlineQuery(inline_query_id, results, other, signal) {
    return this.raw.answerInlineQuery({
      inline_query_id,
      results,
      ...other
    }, signal);
  }
  answerWebAppQuery(web_app_query_id, result, signal) {
    return this.raw.answerWebAppQuery({
      web_app_query_id,
      result
    }, signal);
  }
  savePreparedInlineMessage(user_id, result, other, signal) {
    return this.raw.savePreparedInlineMessage({
      user_id,
      result,
      ...other
    }, signal);
  }
  savePreparedKeyboardButton(user_id, button, signal) {
    return this.raw.savePreparedKeyboardButton({
      user_id,
      button
    }, signal);
  }
  sendInvoice(chat_id, title2, description, payload, currency, prices, other, signal) {
    return this.raw.sendInvoice({
      chat_id,
      title: title2,
      description,
      payload,
      currency,
      prices,
      ...other
    }, signal);
  }
  createInvoiceLink(title2, description, payload, provider_token, currency, prices, other, signal) {
    return this.raw.createInvoiceLink({
      title: title2,
      description,
      payload,
      provider_token,
      currency,
      prices,
      ...other
    }, signal);
  }
  answerShippingQuery(shipping_query_id, ok2, other, signal) {
    return this.raw.answerShippingQuery({
      shipping_query_id,
      ok: ok2,
      ...other
    }, signal);
  }
  answerPreCheckoutQuery(pre_checkout_query_id, ok2, other, signal) {
    return this.raw.answerPreCheckoutQuery({
      pre_checkout_query_id,
      ok: ok2,
      ...other
    }, signal);
  }
  getStarTransactions(other, signal) {
    return this.raw.getStarTransactions({
      ...other
    }, signal);
  }
  refundStarPayment(user_id, telegram_payment_charge_id, signal) {
    return this.raw.refundStarPayment({
      user_id,
      telegram_payment_charge_id
    }, signal);
  }
  editUserStarSubscription(user_id, telegram_payment_charge_id, is_canceled, signal) {
    return this.raw.editUserStarSubscription({
      user_id,
      telegram_payment_charge_id,
      is_canceled
    }, signal);
  }
  verifyUser(user_id, other, signal) {
    return this.raw.verifyUser({
      user_id,
      ...other
    }, signal);
  }
  verifyChat(chat_id, other, signal) {
    return this.raw.verifyChat({
      chat_id,
      ...other
    }, signal);
  }
  removeUserVerification(user_id, signal) {
    return this.raw.removeUserVerification({
      user_id
    }, signal);
  }
  removeChatVerification(chat_id, signal) {
    return this.raw.removeChatVerification({
      chat_id
    }, signal);
  }
  readBusinessMessage(business_connection_id, chat_id, message_id, signal) {
    return this.raw.readBusinessMessage({
      business_connection_id,
      chat_id,
      message_id
    }, signal);
  }
  setPassportDataErrors(user_id, errors, signal) {
    return this.raw.setPassportDataErrors({
      user_id,
      errors
    }, signal);
  }
  sendGame(chat_id, game_short_name, other, signal) {
    return this.raw.sendGame({
      chat_id,
      game_short_name,
      ...other
    }, signal);
  }
  setGameScore(chat_id, message_id, user_id, score, other, signal) {
    return this.raw.setGameScore({
      chat_id,
      message_id,
      user_id,
      score,
      ...other
    }, signal);
  }
  setGameScoreInline(inline_message_id, user_id, score, other, signal) {
    return this.raw.setGameScore({
      inline_message_id,
      user_id,
      score,
      ...other
    }, signal);
  }
  getGameHighScores(chat_id, message_id, user_id, signal) {
    return this.raw.getGameHighScores({
      chat_id,
      message_id,
      user_id
    }, signal);
  }
  getGameHighScoresInline(inline_message_id, user_id, signal) {
    return this.raw.getGameHighScores({
      inline_message_id,
      user_id
    }, signal);
  }
};
var debug2 = browser$1("grammy:bot");
var debugWarn = browser$1("grammy:warn");
var debugErr = browser$1("grammy:error");
var DEFAULT_UPDATE_TYPES = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "business_connection",
  "business_message",
  "edited_business_message",
  "deleted_business_messages",
  "guest_message",
  "stopped_message_generation",
  "inline_query",
  "chosen_inline_result",
  "callback_query",
  "widget_query",
  "shared_widget_query",
  "shipping_query",
  "pre_checkout_query",
  "purchased_paid_media",
  "poll",
  "poll_answer",
  "my_chat_member",
  "managed_bot",
  "chat_join_request",
  "chat_boost",
  "removed_chat_boost",
  "subscription"
];
var Bot = class extends Composer {
  static {
    __name(this, "Bot");
  }
  token;
  pollingRunning;
  pollingAbortController;
  lastTriedUpdateId;
  api;
  me;
  mePromise;
  clientConfig;
  ContextConstructor;
  observedUpdateTypes;
  errorHandler;
  constructor(token, config2) {
    super();
    this.token = token;
    this.pollingRunning = false;
    this.lastTriedUpdateId = 0;
    this.observedUpdateTypes = /* @__PURE__ */ new Set();
    this.errorHandler = async (err) => {
      console.error("Error in middleware while handling update", err.ctx?.update?.update_id, err.error);
      console.error("No error handler was set!");
      console.error("Set your own error handler with `bot.catch = ...`");
      if (this.pollingRunning) {
        console.error("Stopping bot");
        await this.stop();
      }
      throw err;
    };
    if (!token) throw new Error("Empty token!");
    this.me = config2?.botInfo;
    this.clientConfig = config2?.client;
    this.ContextConstructor = config2?.ContextConstructor ?? Context;
    this.api = new Api(token, this.clientConfig);
  }
  set botInfo(botInfo) {
    this.me = botInfo;
  }
  get botInfo() {
    if (this.me === void 0) {
      throw new Error("Bot information unavailable! Make sure to call `await bot.init()` before accessing `bot.botInfo`!");
    }
    return this.me;
  }
  on(filter, ...middleware) {
    for (const [u] of parse(filter).flatMap(preprocess)) {
      this.observedUpdateTypes.add(u);
    }
    return super.on(filter, ...middleware);
  }
  reaction(reaction, ...middleware) {
    this.observedUpdateTypes.add("message_reaction");
    return super.reaction(reaction, ...middleware);
  }
  isInited() {
    return this.me !== void 0;
  }
  async init(signal) {
    if (!this.isInited()) {
      debug2("Initializing bot");
      this.mePromise ??= withRetries(() => this.api.getMe(signal), signal);
      let me;
      try {
        me = await this.mePromise;
      } finally {
        this.mePromise = void 0;
      }
      if (this.me === void 0) this.me = me;
      else debug2("Bot info was set by now, will not overwrite");
    }
    debug2(`I am ${this.me.username}!`);
  }
  async handleUpdates(updates) {
    for (const update of updates) {
      this.lastTriedUpdateId = update.update_id;
      try {
        await this.handleUpdate(update);
      } catch (err) {
        if (err instanceof BotError) {
          await this.errorHandler(err);
        } else {
          console.error("FATAL: grammY unable to handle:", err);
          throw err;
        }
      }
    }
  }
  async handleUpdate(update, webhookReplyEnvelope) {
    if (this.me === void 0) {
      throw new Error("Bot not initialized! Either call `await bot.init()`, or directly set the `botInfo` option in the `Bot` constructor to specify a known bot info object.");
    }
    debug2(`Processing update ${update.update_id}`);
    const api = new Api(this.token, this.clientConfig, webhookReplyEnvelope);
    const t = this.api.config.installedTransformers();
    if (t.length > 0) api.config.use(...t);
    const ctx = new this.ContextConstructor(update, api, this.me);
    try {
      await run(this.middleware(), ctx);
    } catch (err) {
      debugErr(`Error in middleware for update ${update.update_id}`);
      throw new BotError(err, ctx);
    }
  }
  async start(options) {
    const setup2 = [];
    if (!this.isInited()) {
      setup2.push(this.init(this.pollingAbortController?.signal));
    }
    if (this.pollingRunning) {
      await Promise.all(setup2);
      debug2("Simple long polling already running!");
      return;
    }
    this.pollingRunning = true;
    this.pollingAbortController = new AbortController();
    setup2.push(withRetries(async () => {
      await this.api.deleteWebhook({
        drop_pending_updates: options?.drop_pending_updates
      }, this.pollingAbortController?.signal);
    }, this.pollingAbortController?.signal));
    try {
      await Promise.all(setup2);
      await options?.onStart?.(this.botInfo);
    } catch (err) {
      this.pollingRunning = false;
      this.pollingAbortController = void 0;
      throw err;
    }
    if (!this.pollingRunning) return;
    validateAllowedUpdates(this.observedUpdateTypes, options?.allowed_updates);
    this.use = noUseFunction;
    debug2("Starting simple long polling");
    await this.loop(options);
    debug2("Middleware is done running");
  }
  async stop() {
    if (this.pollingRunning) {
      debug2("Stopping bot, saving update offset");
      this.pollingRunning = false;
      this.pollingAbortController?.abort();
      const offset = this.lastTriedUpdateId + 1;
      await this.api.getUpdates({
        offset,
        limit: 1
      }).finally(() => this.pollingAbortController = void 0);
    } else {
      debug2("Bot is not running!");
    }
  }
  isRunning() {
    return this.pollingRunning;
  }
  catch(errorHandler) {
    this.errorHandler = errorHandler;
  }
  async loop(options) {
    const limit = options?.limit;
    const timeout = options?.timeout ?? 30;
    let allowed_updates = options?.allowed_updates ?? [];
    try {
      while (this.pollingRunning) {
        const updates = await this.fetchUpdates({
          limit,
          timeout,
          allowed_updates
        });
        if (updates === void 0) break;
        await this.handleUpdates(updates);
        allowed_updates = void 0;
      }
    } finally {
      this.pollingRunning = false;
    }
  }
  async fetchUpdates({ limit, timeout, allowed_updates }) {
    const offset = this.lastTriedUpdateId + 1;
    let updates = void 0;
    do {
      try {
        updates = await this.api.getUpdates({
          offset,
          limit,
          timeout,
          allowed_updates
        }, this.pollingAbortController?.signal);
      } catch (error) {
        await this.handlePollingError(error);
      }
    } while (updates === void 0 && this.pollingRunning);
    return updates;
  }
  async handlePollingError(error) {
    if (!this.pollingRunning) {
      debug2("Pending getUpdates request cancelled");
      return;
    }
    let sleepSeconds = 3;
    if (error instanceof GrammyError) {
      debugErr(error.message);
      if (error.error_code === 401 || error.error_code === 409) {
        throw error;
      } else if (error.error_code === 429) {
        debugErr("Bot API server is closing.");
        sleepSeconds = error.parameters.retry_after ?? sleepSeconds;
      }
    } else debugErr(error);
    debugErr(`Call to getUpdates failed, retrying in ${sleepSeconds} seconds ...`);
    await sleep(1e3 * sleepSeconds);
  }
};
async function withRetries(task, signal) {
  const INITIAL_DELAY = 50;
  let lastDelay = 50;
  async function handleError(error) {
    let delay = false;
    let strategy = "rethrow";
    if (error instanceof HttpError) {
      delay = true;
      strategy = "retry";
    } else if (error instanceof GrammyError) {
      if (error.error_code >= 500) {
        delay = true;
        strategy = "retry";
      } else if (error.error_code === 429) {
        const retryAfterSeconds = error.parameters.retry_after;
        if (typeof retryAfterSeconds === "number") {
          await sleep(1e3 * retryAfterSeconds, signal);
          lastDelay = INITIAL_DELAY;
        } else {
          delay = true;
        }
        strategy = "retry";
      }
    }
    if (delay) {
      if (lastDelay !== 50) {
        await sleep(lastDelay, signal);
      }
      const TWENTY_MINUTES = 20 * 60 * 1e3;
      lastDelay = Math.min(TWENTY_MINUTES, 2 * lastDelay);
    }
    return strategy;
  }
  __name(handleError, "handleError");
  let result = {
    ok: false
  };
  while (!result.ok) {
    try {
      result = {
        ok: true,
        value: await task()
      };
    } catch (error) {
      debugErr(error);
      const strategy = await handleError(error);
      switch (strategy) {
        case "retry":
          continue;
        case "rethrow":
          throw error;
      }
    }
  }
  return result.value;
}
__name(withRetries, "withRetries");
async function sleep(milliseconds, signal) {
  let handle;
  let reject;
  function abort() {
    reject?.(new Error("Aborted delay"));
    if (handle !== void 0) clearTimeout(handle);
  }
  __name(abort, "abort");
  try {
    await new Promise((res, rej) => {
      reject = rej;
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort);
      handle = setTimeout(res, milliseconds);
    });
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}
__name(sleep, "sleep");
function validateAllowedUpdates(updates, allowed = DEFAULT_UPDATE_TYPES) {
  const impossible = Array.from(updates).filter((u) => !allowed.includes(u));
  if (impossible.length > 0) {
    debugWarn(`You registered listeners for the following update types, but you did not specify them in \`allowed_updates\` so they may not be received: ${impossible.map((u) => `'${u}'`).join(", ")}`);
  }
}
__name(validateAllowedUpdates, "validateAllowedUpdates");
function noUseFunction() {
  throw new Error(`It looks like you are registering more listeners on your bot from within other listeners! This means that every time your bot handles a message like this one, new listeners will be added. This list grows until your machine crashes, so grammY throws this error to tell you that you should probably do things a bit differently. If you're unsure how to resolve this problem, you can ask in the group chat: https://telegram.me/grammyjs

On the other hand, if you actually know what you're doing and you do need to install further middleware while your bot is running, consider installing a composer instance on your bot, and in turn augment the composer after the fact. This way, you can circumvent this protection against memory leaks.`);
}
__name(noUseFunction, "noUseFunction");
var ALL_UPDATE_TYPES = [
  ...DEFAULT_UPDATE_TYPES,
  "chat_member",
  "message_reaction",
  "message_reaction_count"
];
var ALL_CHAT_PERMISSIONS = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_react_to_messages: true,
  can_change_info: true,
  can_invite_users: true,
  can_edit_tag: true,
  can_pin_messages: true,
  can_manage_topics: true
};
var API_CONSTANTS = {
  DEFAULT_UPDATE_TYPES,
  ALL_UPDATE_TYPES,
  ALL_CHAT_PERMISSIONS
};
Object.freeze(API_CONSTANTS);
var debug3 = browser$1("grammy:session");
var SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";
var SECRET_HEADER_LOWERCASE = SECRET_HEADER.toLowerCase();
var WRONG_TOKEN_ERROR = "secret token is wrong";
var ok = /* @__PURE__ */ __name(() => new Response(null, {
  status: 200
}), "ok");
var okJson = /* @__PURE__ */ __name((json) => new Response(json, {
  status: 200,
  headers: {
    "Content-Type": "application/json"
  }
}), "okJson");
var unauthorized = /* @__PURE__ */ __name(() => new Response('"unauthorized"', {
  status: 401,
  statusText: WRONG_TOKEN_ERROR
}), "unauthorized");
var awsLambda = /* @__PURE__ */ __name((event, _context, callback) => ({
  get update() {
    return JSON.parse(event.body ?? "{}");
  },
  header: event.headers[SECRET_HEADER] ?? event.headers[SECRET_HEADER_LOWERCASE],
  end: /* @__PURE__ */ __name(() => callback(null, {
    statusCode: 200
  }), "end"),
  respond: /* @__PURE__ */ __name((json) => callback(null, {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: json
  }), "respond"),
  unauthorized: /* @__PURE__ */ __name(() => callback(null, {
    statusCode: 401
  }), "unauthorized")
}), "awsLambda");
var awsLambdaAsync = /* @__PURE__ */ __name((event, _context) => {
  let resolveResponse;
  return {
    get update() {
      return JSON.parse(event.body ?? "{}");
    },
    header: event.headers[SECRET_HEADER] ?? event.headers[SECRET_HEADER_LOWERCASE],
    end: /* @__PURE__ */ __name(() => resolveResponse({
      statusCode: 200
    }), "end"),
    respond: /* @__PURE__ */ __name((json) => resolveResponse({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: json
    }), "respond"),
    unauthorized: /* @__PURE__ */ __name(() => resolveResponse({
      statusCode: 401
    }), "unauthorized"),
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "awsLambdaAsync");
var azure = /* @__PURE__ */ __name((context, request) => ({
  get update() {
    return request.body;
  },
  header: request.headers?.[SECRET_HEADER_LOWERCASE],
  end: /* @__PURE__ */ __name(() => context.res = {
    status: 200,
    body: ""
  }, "end"),
  respond: /* @__PURE__ */ __name((json) => {
    if (typeof context.res?.send === "function") {
      context.res?.set?.("Content-Type", "application/json");
      context.res.send(json);
    } else {
      context.res = {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: json
      };
    }
  }, "respond"),
  unauthorized: /* @__PURE__ */ __name(() => {
    if (typeof context.res?.send === "function") {
      context.res.send(401, WRONG_TOKEN_ERROR);
    } else {
      context.res = {
        status: 401,
        body: WRONG_TOKEN_ERROR
      };
    }
  }, "unauthorized")
}), "azure");
var azureV4 = /* @__PURE__ */ __name((request) => {
  let resolveResponse;
  return {
    get update() {
      return request.json();
    },
    header: request.headers.get(SECRET_HEADER) || void 0,
    end: /* @__PURE__ */ __name(() => resolveResponse({
      status: 204
    }), "end"),
    respond: /* @__PURE__ */ __name((json) => resolveResponse({
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: json
    }), "respond"),
    unauthorized: /* @__PURE__ */ __name(() => resolveResponse({
      status: 401,
      body: WRONG_TOKEN_ERROR
    }), "unauthorized"),
    handlerReturn: new Promise((resolve) => resolveResponse = resolve)
  };
}, "azureV4");
var bun = /* @__PURE__ */ __name((request) => {
  let resolveResponse;
  return {
    get update() {
      return request.json();
    },
    header: request.headers.get(SECRET_HEADER) || void 0,
    end: /* @__PURE__ */ __name(() => {
      resolveResponse(ok());
    }, "end"),
    respond: /* @__PURE__ */ __name((json) => {
      resolveResponse(okJson(json));
    }, "respond"),
    unauthorized: /* @__PURE__ */ __name(() => {
      resolveResponse(unauthorized());
    }, "unauthorized"),
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "bun");
var cloudflare = /* @__PURE__ */ __name((event) => {
  let resolveResponse;
  event.respondWith(new Promise((resolve) => {
    resolveResponse = resolve;
  }));
  return {
    get update() {
      return event.request.json();
    },
    header: event.request.headers.get(SECRET_HEADER) || void 0,
    end: /* @__PURE__ */ __name(() => {
      resolveResponse(ok());
    }, "end"),
    respond: /* @__PURE__ */ __name((json) => {
      resolveResponse(okJson(json));
    }, "respond"),
    unauthorized: /* @__PURE__ */ __name(() => {
      resolveResponse(unauthorized());
    }, "unauthorized")
  };
}, "cloudflare");
var cloudflareModule = /* @__PURE__ */ __name((request) => {
  let resolveResponse;
  return {
    get update() {
      return request.json();
    },
    header: request.headers.get(SECRET_HEADER) || void 0,
    end: /* @__PURE__ */ __name(() => {
      resolveResponse(ok());
    }, "end"),
    respond: /* @__PURE__ */ __name((json) => {
      resolveResponse(okJson(json));
    }, "respond"),
    unauthorized: /* @__PURE__ */ __name(() => {
      resolveResponse(unauthorized());
    }, "unauthorized"),
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "cloudflareModule");
var express = /* @__PURE__ */ __name((req, res) => ({
  get update() {
    return req.body;
  },
  header: req.header(SECRET_HEADER),
  end: /* @__PURE__ */ __name(() => res.end(), "end"),
  respond: /* @__PURE__ */ __name((json) => {
    res.set("Content-Type", "application/json");
    res.send(json);
  }, "respond"),
  unauthorized: /* @__PURE__ */ __name(() => {
    res.status(401).send(WRONG_TOKEN_ERROR);
  }, "unauthorized")
}), "express");
var fastify = /* @__PURE__ */ __name((request, reply) => ({
  get update() {
    return request.body;
  },
  header: request.headers[SECRET_HEADER_LOWERCASE],
  end: /* @__PURE__ */ __name(() => reply.send(""), "end"),
  respond: /* @__PURE__ */ __name((json) => reply.headers({
    "Content-Type": "application/json"
  }).send(json), "respond"),
  unauthorized: /* @__PURE__ */ __name(() => reply.code(401).send(WRONG_TOKEN_ERROR), "unauthorized")
}), "fastify");
var hono = /* @__PURE__ */ __name((c) => {
  let resolveResponse;
  return {
    get update() {
      return c.req.json();
    },
    header: c.req.header(SECRET_HEADER),
    end: /* @__PURE__ */ __name(() => {
      resolveResponse(c.body(""));
    }, "end"),
    respond: /* @__PURE__ */ __name((json) => {
      c.header("Content-Type", "application/json");
      resolveResponse(c.body(json));
    }, "respond"),
    unauthorized: /* @__PURE__ */ __name(() => {
      c.status(401);
      resolveResponse(c.body(""));
    }, "unauthorized"),
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "hono");
var http = /* @__PURE__ */ __name((req, res) => {
  const secretHeaderFromRequest = req.headers[SECRET_HEADER_LOWERCASE];
  return {
    get update() {
      return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk)).once("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          try {
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        }).once("error", reject);
      });
    },
    header: Array.isArray(secretHeaderFromRequest) ? secretHeaderFromRequest[0] : secretHeaderFromRequest,
    end: /* @__PURE__ */ __name(() => res.end(), "end"),
    respond: /* @__PURE__ */ __name((json) => res.writeHead(200, {
      "Content-Type": "application/json"
    }).end(json), "respond"),
    unauthorized: /* @__PURE__ */ __name(() => res.writeHead(401).end(WRONG_TOKEN_ERROR), "unauthorized")
  };
}, "http");
var koa = /* @__PURE__ */ __name((ctx) => ({
  get update() {
    return ctx.request.body;
  },
  header: ctx.get(SECRET_HEADER) || void 0,
  end: /* @__PURE__ */ __name(() => {
    ctx.body = "";
  }, "end"),
  respond: /* @__PURE__ */ __name((json) => {
    ctx.set("Content-Type", "application/json");
    ctx.response.body = json;
  }, "respond"),
  unauthorized: /* @__PURE__ */ __name(() => {
    ctx.status = 401;
  }, "unauthorized")
}), "koa");
var nextJs = /* @__PURE__ */ __name((request, response) => ({
  get update() {
    return request.body;
  },
  header: request.headers[SECRET_HEADER_LOWERCASE],
  end: /* @__PURE__ */ __name(() => response.end(), "end"),
  respond: /* @__PURE__ */ __name((json) => {
    response.status(200);
    response.setHeader?.("Content-Type", "application/json");
    response.send(json);
  }, "respond"),
  unauthorized: /* @__PURE__ */ __name(() => response.status(401).send(WRONG_TOKEN_ERROR), "unauthorized")
}), "nextJs");
var nhttp = /* @__PURE__ */ __name((rev) => ({
  get update() {
    return rev.body;
  },
  header: rev.headers.get(SECRET_HEADER) || void 0,
  end: /* @__PURE__ */ __name(() => rev.response.sendStatus(200), "end"),
  respond: /* @__PURE__ */ __name((json) => {
    rev.response.setHeader?.("content-type", "application/json");
    return rev.response.status(200).send(json);
  }, "respond"),
  unauthorized: /* @__PURE__ */ __name(() => rev.response.status(401).send(WRONG_TOKEN_ERROR), "unauthorized")
}), "nhttp");
var oak = /* @__PURE__ */ __name((ctx) => ({
  get update() {
    return ctx.request.body.json();
  },
  header: ctx.request.headers.get(SECRET_HEADER) || void 0,
  end: /* @__PURE__ */ __name(() => {
    ctx.response.status = 200;
  }, "end"),
  respond: /* @__PURE__ */ __name((json) => {
    ctx.response.type = "json";
    ctx.response.body = json;
  }, "respond"),
  unauthorized: /* @__PURE__ */ __name(() => {
    ctx.response.status = 401;
  }, "unauthorized")
}), "oak");
var serveHttp = /* @__PURE__ */ __name((requestEvent) => ({
  get update() {
    return requestEvent.request.json();
  },
  header: requestEvent.request.headers.get(SECRET_HEADER) || void 0,
  end: /* @__PURE__ */ __name(() => requestEvent.respondWith(ok()), "end"),
  respond: /* @__PURE__ */ __name((json) => requestEvent.respondWith(okJson(json)), "respond"),
  unauthorized: /* @__PURE__ */ __name(() => requestEvent.respondWith(unauthorized()), "unauthorized")
}), "serveHttp");
var stdHttp = /* @__PURE__ */ __name((req) => {
  let resolveResponse;
  return {
    get update() {
      return req.json();
    },
    header: req.headers.get(SECRET_HEADER) || void 0,
    end: /* @__PURE__ */ __name(() => {
      if (resolveResponse) resolveResponse(ok());
    }, "end"),
    respond: /* @__PURE__ */ __name((json) => {
      if (resolveResponse) resolveResponse(okJson(json));
    }, "respond"),
    unauthorized: /* @__PURE__ */ __name(() => {
      if (resolveResponse) resolveResponse(unauthorized());
    }, "unauthorized"),
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "stdHttp");
var sveltekit = /* @__PURE__ */ __name(({ request }) => {
  let resolveResponse;
  return {
    get update() {
      return request.json();
    },
    header: request.headers.get(SECRET_HEADER) || void 0,
    end: /* @__PURE__ */ __name(() => {
      if (resolveResponse) resolveResponse(ok());
    }, "end"),
    respond: /* @__PURE__ */ __name((json) => {
      if (resolveResponse) resolveResponse(okJson(json));
    }, "respond"),
    unauthorized: /* @__PURE__ */ __name(() => {
      if (resolveResponse) resolveResponse(unauthorized());
    }, "unauthorized"),
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "sveltekit");
var worktop = /* @__PURE__ */ __name((req, res) => ({
  get update() {
    return req.json();
  },
  header: req.headers.get(SECRET_HEADER) ?? void 0,
  end: /* @__PURE__ */ __name(() => res.end(null), "end"),
  respond: /* @__PURE__ */ __name((json) => res.send(200, json, {
    "content-type": "application/json"
  }), "respond"),
  unauthorized: /* @__PURE__ */ __name(() => res.send(401, WRONG_TOKEN_ERROR), "unauthorized")
}), "worktop");
var elysia = /* @__PURE__ */ __name((ctx) => {
  let resolveResponse;
  return {
    get update() {
      return ctx.body;
    },
    header: ctx.headers[SECRET_HEADER_LOWERCASE],
    end() {
      resolveResponse("");
    },
    respond(json) {
      ctx.set.headers["content-type"] = "application/json";
      resolveResponse(json);
    },
    unauthorized() {
      ctx.set.status = 401;
      resolveResponse("");
    },
    handlerReturn: new Promise((res) => resolveResponse = res)
  };
}, "elysia");
var adapters = {
  "aws-lambda": awsLambda,
  "aws-lambda-async": awsLambdaAsync,
  azure,
  "azure-v4": azureV4,
  bun,
  cloudflare,
  "cloudflare-mod": cloudflareModule,
  elysia,
  express,
  fastify,
  hono,
  http,
  https: http,
  koa,
  "next-js": nextJs,
  nhttp,
  oak,
  serveHttp,
  "std/http": stdHttp,
  sveltekit,
  worktop
};
var debugErr1 = browser$1("grammy:error");
var callbackAdapter = /* @__PURE__ */ __name((update, callback, header, unauthorized2 = () => callback('"unauthorized"')) => ({
  update: Promise.resolve(update),
  respond: callback,
  header,
  unauthorized: unauthorized2
}), "callbackAdapter");
var adapters1 = {
  ...adapters,
  callback: callbackAdapter
};
function compareSecretToken(header, token) {
  if (token === void 0) {
    return true;
  }
  if (header === void 0) {
    return false;
  }
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(header);
  const tokenBytes = encoder.encode(token);
  if (headerBytes.length !== tokenBytes.length) {
    return false;
  }
  let hasDifference = 0;
  for (let i = 0; i < tokenBytes.length; i++) {
    const headerByte = headerBytes[i];
    const tokenByte = tokenBytes[i];
    hasDifference |= headerByte ^ tokenByte;
  }
  return hasDifference === 0;
}
__name(compareSecretToken, "compareSecretToken");
function webhookCallback(bot, adapter = defaultAdapter, onTimeout, timeoutMilliseconds, secretToken) {
  if (bot.isRunning()) {
    throw new Error("Bot is already running via long polling, the webhook setup won't receive any updates!");
  } else {
    bot.start = () => {
      throw new Error("You already started the bot via webhooks, calling `bot.start()` starts the bot with long polling and this will prevent your webhook setup from receiving any updates!");
    };
  }
  const { onTimeout: timeout = "throw", timeoutMilliseconds: ms2 = 1e4, secretToken: token } = typeof onTimeout === "object" ? onTimeout : {
    onTimeout,
    timeoutMilliseconds,
    secretToken
  };
  let initialized = false;
  const server = typeof adapter === "string" ? adapters1[adapter] : adapter;
  return async (...args) => {
    const handler = server(...args);
    if (!initialized) {
      await bot.init();
      initialized = true;
    }
    if (!compareSecretToken(handler.header, token)) {
      await handler.unauthorized();
      return handler.handlerReturn;
    }
    let usedWebhookReply = false;
    const webhookReplyEnvelope = {
      async send(json) {
        usedWebhookReply = true;
        await handler.respond(json);
      }
    };
    await timeoutIfNecessary(bot.handleUpdate(await handler.update, webhookReplyEnvelope), typeof timeout === "function" ? () => timeout(...args) : timeout, ms2);
    if (!usedWebhookReply) handler.end?.();
    return handler.handlerReturn;
  };
}
__name(webhookCallback, "webhookCallback");
function timeoutIfNecessary(task, onTimeout, timeout) {
  if (timeout === Infinity) return task;
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      debugErr1(`Request timed out after ${timeout} ms`);
      if (onTimeout === "throw") {
        reject(new Error(`Request timed out after ${timeout} ms`));
      } else {
        if (typeof onTimeout === "function") onTimeout();
        resolve();
      }
      const now = Date.now();
      task.finally(() => {
        const diff = Date.now() - now;
        debugErr1(`Request completed ${diff} ms after timeout!`);
      });
    }, timeout);
    task.then(resolve).catch(reject).finally(() => clearTimeout(handle));
  });
}
__name(timeoutIfNecessary, "timeoutIfNecessary");

// src/ai/gemini.ts
var BASE = "https://generativelanguage.googleapis.com/v1beta/models";
function createGemini(apiKey, model = "gemini-2.5-flash") {
  return {
    id: "gemini",
    label: "Google Gemini",
    model,
    async chat(messages, system) {
      const contents = messages.map((m2) => ({
        role: m2.role === "assistant" ? "model" : "user",
        parts: [{ text: m2.content }]
      }));
      const body = { contents };
      if (system) body.systemInstruction = { parts: [{ text: system }] };
      const response = await fetch(
        `${BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      if (!response.ok) {
        throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
      if (!text) {
        throw new Error(
          data.promptFeedback?.blockReason ? `Gemini memblokir prompt (${data.promptFeedback.blockReason})` : "Gemini mengembalikan respons kosong"
        );
      }
      return text;
    }
  };
}
__name(createGemini, "createGemini");

// src/ai/groq.ts
var ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
function createGroq(apiKey, model = "llama-3.3-70b-versatile") {
  return {
    id: "groq",
    label: "Groq",
    model,
    async chat(messages, system) {
      const payload = [
        ...system ? [{ role: "system", content: system }] : [],
        ...messages.map((m2) => ({ role: m2.role, content: m2.content }))
      ];
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages: payload })
      });
      if (!response.ok) {
        throw new Error(`Groq ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Groq mengembalikan respons kosong");
      return text;
    }
  };
}
__name(createGroq, "createGroq");

// src/ai/index.ts
function getProviders(env) {
  const providers = [];
  if (env.GEMINI_API_KEY) {
    providers.push(createGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL));
  }
  if (env.GROQ_API_KEY) {
    providers.push(createGroq(env.GROQ_API_KEY, env.GROQ_MODEL));
  }
  return providers;
}
__name(getProviders, "getProviders");
function resolveProvider(providers, preferredId, fallbackId) {
  const wanted = preferredId ?? fallbackId ?? "gemini";
  return providers.find((p) => p.id === wanted) ?? providers[0];
}
__name(resolveProvider, "resolveProvider");

// src/store.ts
var memMessages = /* @__PURE__ */ new Map();
var memPrefs = /* @__PURE__ */ new Map();
async function getHistory(env, chatId, limit = 20) {
  if (env.DB) {
    const { results } = await env.DB.prepare(
      "SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?"
    ).bind(chatId, limit).all();
    return results.reverse().map((row) => ({
      role: row.role === "assistant" ? "assistant" : "user",
      content: row.content
    }));
  }
  return (memMessages.get(chatId) ?? []).slice(-limit);
}
__name(getHistory, "getHistory");
async function saveHistory(env, chatId, messages, keep = 20) {
  const trimmed = messages.slice(-keep);
  if (env.DB) {
    const statements = [
      env.DB.prepare("DELETE FROM chat_messages WHERE chat_id = ?").bind(chatId),
      ...trimmed.map(
        (m2) => env.DB.prepare("INSERT INTO chat_messages (chat_id, role, content) VALUES (?, ?, ?)").bind(chatId, m2.role, m2.content)
      ),
      env.DB.prepare("DELETE FROM chat_messages WHERE created_at < datetime('now', '-7 days')")
    ];
    await env.DB.batch(statements);
    return;
  }
  memMessages.set(chatId, trimmed);
}
__name(saveHistory, "saveHistory");
async function getPreference(env, chatId) {
  if (env.DB) {
    const row = await env.DB.prepare(
      "SELECT provider FROM chat_preferences WHERE chat_id = ?"
    ).bind(chatId).first();
    return { provider: row?.provider ?? void 0 };
  }
  return memPrefs.get(chatId) ?? {};
}
__name(getPreference, "getPreference");
async function setPreference(env, chatId, provider) {
  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO chat_preferences (chat_id, provider, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(chat_id) DO UPDATE SET
         provider = excluded.provider,
         updated_at = datetime('now')`
    ).bind(chatId, provider).run();
    return;
  }
  memPrefs.set(chatId, { provider });
}
__name(setPreference, "setPreference");
async function clearHistory(env, chatId) {
  if (env.DB) {
    await env.DB.prepare("DELETE FROM chat_messages WHERE chat_id = ?").bind(chatId).run();
  }
  memMessages.delete(chatId);
}
__name(clearHistory, "clearHistory");

// src/bot.ts
var SYSTEM_PROMPT = `Kamu adalah asisten AI yang ramah, ringkas, dan membantu.
Jawab dalam Bahasa Indonesia unless user meminta bahasa lain.
Gunakan Markdown ringan (bold, italic, kode) bila membantu. Jangan terlalu panjang kecuali diminta.`;
var TELEGRAM_LIMIT = 4e3;
async function replyLong(ctx, text) {
  const chunks = [];
  let rest = text;
  while (rest.length > TELEGRAM_LIMIT) {
    const slice = rest.slice(0, TELEGRAM_LIMIT);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
    const cut = breakAt > TELEGRAM_LIMIT / 2 ? breakAt : TELEGRAM_LIMIT;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}
__name(replyLong, "replyLong");
function friendlyError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("429")) return "\u23F3 Rate limit AI tercapai. Tunggu sebentar lalu coba lagi.";
  if (raw.includes("401") || raw.includes("403")) return "\u{1F511} API key AI tidak valid. Cek konfigurasi secret bot.";
  if (raw.includes("404")) return "\u{1F916} Model tidak ditemukan. Cek nama model di wrangler.toml.";
  return `\u26A0\uFE0F Gagal memanggil AI: ${raw.slice(0, 250)}`;
}
__name(friendlyError, "friendlyError");
function createBot(env) {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const providers = getProviders(env);
  async function currentProvider(ctx) {
    if (!providers.length) return void 0;
    const pref = await getPreference(env, ctx.chat?.id ?? ctx.from.id);
    return resolveProvider(providers, pref.provider, env.DEFAULT_PROVIDER);
  }
  __name(currentProvider, "currentProvider");
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `\u{1F44B} Halo! Saya asisten AI pribadi kamu.

Ketik saja pesan apa pun, nanti saya jawab pakai ${providers.map((p) => p.label).join(" / ") || "AI (belum dikonfigurasi)"}.

/provider \u2014 lihat & pilih model
/status \u2014 info sesi saat ini
/clear \u2014 hapus riwayat chat
/help \u2014 daftar perintah`
    );
  });
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `Perintah yang tersedia:

/start \u2014 pesan sambutan
/provider \u2014 daftar provider AI aktif
/use <id> \u2014 ganti provider (contoh: /use groq)
/status \u2014 provider & model yang dipakai
/clear \u2014 hapus riwayat percakapan
/help \u2014 daftar ini`
    );
  });
  bot.command("provider", async (ctx) => {
    if (!providers.length) {
      await ctx.reply("Belum ada API key AI yang aktif. Isi GEMINI_API_KEY / GROQ_API_KEY di secret.");
      return;
    }
    const pref = await getPreference(env, ctx.chat?.id ?? ctx.from.id);
    const active = resolveProvider(providers, pref.provider, env.DEFAULT_PROVIDER);
    const lines = providers.map(
      (p) => `${p.id === active.id ? "\u2705" : "\u25AA\uFE0F"} <b>${p.label}</b> \u2014 <code>${p.model}</code> (id: ${p.id})`
    );
    await ctx.reply(
      `Provider tersedia:

${lines.join("\n")}

Ganti dengan: /use &lt;id&gt;`,
      { parse_mode: "HTML" }
    );
  });
  bot.command("use", async (ctx) => {
    const id = ctx.match.toString().trim().toLowerCase();
    if (!id) {
      await ctx.reply("Contoh: /use gemini atau /use groq");
      return;
    }
    const picked = providers.find((p) => p.id === id);
    if (!picked) {
      await ctx.reply(`Provider "${id}" tidak aktif. Ketik /provider untuk melihat daftar.`);
      return;
    }
    const chatId = ctx.chat?.id ?? ctx.from.id;
    await setPreference(env, chatId, picked.id);
    await ctx.reply(`\u2705 Sekarang pakai <b>${picked.label}</b> (${picked.model})`, {
      parse_mode: "HTML"
    });
  });
  bot.command("status", async (ctx) => {
    const provider = await currentProvider(ctx);
    const chatId = ctx.chat?.id ?? ctx.from.id;
    const history = await getHistory(env, chatId);
    if (!provider) {
      await ctx.reply("Belum ada provider AI aktif.");
      return;
    }
    await ctx.reply(
      `\u{1F4CA} Status

Provider: <b>${provider.label}</b>
Model: <code>${provider.model}</code>
Pesan di riwayat: ${history.length}`,
      { parse_mode: "HTML" }
    );
  });
  bot.command("clear", async (ctx) => {
    await clearHistory(env, ctx.chat?.id ?? ctx.from.id);
    await ctx.reply("\u{1F9F9} Riwayat percakapan dihapus.");
  });
  bot.command("ping", async (ctx) => {
    await ctx.reply("\u{1F3D3} pong");
  });
  bot.on("message:text", async (ctx) => {
    const provider = await currentProvider(ctx);
    if (!provider) {
      await ctx.reply("Belum ada API key AI yang aktif. Isi secret GEMINI_API_KEY atau GROQ_API_KEY.");
      return;
    }
    const chatId = ctx.chat?.id ?? ctx.from.id;
    const maxHistory = Number(env.MAX_HISTORY ?? 20) || 20;
    const history = await getHistory(env, chatId);
    history.push({ role: "user", content: ctx.message.text });
    await ctx.replyWithChatAction("typing");
    try {
      const answer = await provider.chat(history.slice(-maxHistory), SYSTEM_PROMPT);
      const updated = [...history, { role: "assistant", content: answer }].slice(-maxHistory);
      await saveHistory(env, chatId, updated, maxHistory);
      await replyLong(ctx, answer);
    } catch (error) {
      await ctx.reply(friendlyError(error));
    }
  });
  bot.catch((err) => {
    console.error("Bot error:", err.error);
  });
  return bot;
}
__name(createBot, "createBot");

// src/index.ts
var index_default = {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({ ok: true, service: "k1ing" });
    }
    if (url.pathname === "/webhook" && request.method === "POST") {
      const secret = env.TELEGRAM_WEBHOOK_SECRET;
      if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
        return new Response("Unauthorized", { status: 401 });
      }
      const bot = createBot(env);
      return webhookCallback(bot, "cloudflare-mod")(request);
    }
    if (url.pathname === "/admin/setWebhook") {
      const adminSecret = env.ADMIN_SECRET;
      const provided = url.searchParams.get("secret");
      if (!adminSecret || !provided || provided !== adminSecret) {
        return new Response("Unauthorized", { status: 401 });
      }
      const telegramApi = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
      const response = await fetch(telegramApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: `${url.origin}/webhook`,
          secret_token: env.TELEGRAM_WEBHOOK_SECRET,
          allowed_updates: ["message"],
          drop_pending_updates: true
        })
      });
      return new Response(await response.text(), {
        status: response.status,
        headers: { "content-type": "application/json" }
      });
    }
    return new Response("Not found", { status: 404 });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
