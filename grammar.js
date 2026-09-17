/**
 * @file PostgreSQL configuration files for tree-sitter: postgresql.conf, pg_hba.conf and pg_ident.conf
 * @author Brandon Williams
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// The three files share one grammar because their lines never look alike:
// a setting is a name and one value, a pg_hba.conf rule starts with a
// connection type, and a pg_ident.conf line has three bare fields.
//
// A word is any bare field: a setting name, a bare value, a role, a host
// name, a method. It cannot start with a digit, which keeps numbers on their
// own token, nor with a character that opens another token. A single quote
// inside it is just a character: only a double quote quotes a token in
// pg_hba.conf and pg_ident.conf, so `it's` is a role, while in
// postgresql.conf a bare value never holds one.
const WORD = /[A-Za-z_.$][^\s=#",]*/;

/**
 * @param {string} separator
 * @param {RuleOrLiteral} rule
 */
const list = (separator, rule) => seq(rule, repeat(seq(separator, rule)));

export default grammar({
  name: "postgresql_conf",

  extras: $ => [/[ \t]/, $.comment],

  word: $ => $._word,

  rules: {
    source_file: $ => seq(
      repeat(seq(optional($._entry), $._newline)),
      optional($._entry),
    ),

    _entry: $ => choice($.setting, $.include, $.hba_rule, $.user_mapping),

    _newline: _ => /\r?\n/,

    comment: _ => /#[^\r\n]*/,

    _word: _ => WORD,

    // postgresql.conf

    setting: $ => seq(
      field("name", alias($._word, $.setting_name)),
      optional("="),
      field("value", $._value),
    ),

    _value: $ => choice($.string, $.number, $.boolean, alias($._word, $.bare_value)),

    string: _ => /'([^'\r\n]|'')*'/,

    number: $ => seq(
      token(prec(1, /-?\d+(\.\d+)?([eE][+-]?\d+)?/)),
      optional(alias(token.immediate(/[A-Za-z]+/), $.unit)),
    ),

    boolean: _ => token(prec(1, /[oO][nN]|[oO][fF][fF]|[tT][rR][uU][eE]|[fF][aA][lL][sS][eE]|[yY][eE][sS]|[nN][oO]/)),

    // include, include_if_exists and include_dir appear in postgresql.conf,
    // where an equals sign is allowed, and in pg_hba.conf and pg_ident.conf,
    // where the path may be bare.
    include: $ => seq(
      choice("include", "include_if_exists", "include_dir"),
      optional("="),
      field("path", choice($.string, alias(/[^\s'"#=][^\s#]*/, $.path))),
    ),

    // pg_hba.conf

    hba_rule: $ => choice(
      seq(
        field("type", alias("local", $.connection_type)),
        field("database", $.database),
        field("user", $.user),
        field("method", $.auth_method),
        repeat(field("option", $.auth_option)),
      ),
      seq(
        field("type", alias(choice("host", "hostssl", "hostnossl", "hostgssenc", "hostnogssenc"), $.connection_type)),
        field("database", $.database),
        field("user", $.user),
        field("address", $.address),
        optional(field("netmask", alias($.ip_address, $.netmask))),
        field("method", $.auth_method),
        repeat(field("option", $.auth_option)),
      ),
    ),

    database: $ => list(",", $._hba_name),

    user: $ => list(",", $._hba_name),

    // A name that starts with a single quote is a name, quote and all, since
    // the server's tokenizer knows only double quotes; `'db'` is a database
    // called 'db'.
    _hba_name: $ => choice(
      alias($._word, $.name),
      alias(token(/'[^\s=#",]*/), $.name),
      $.role_group,
      $.file_reference,
      $.regex,
      $.quoted_name,
    ),

    role_group: $ => seq("+", alias($._word, $.name)),

    file_reference: $ => seq("@", alias(token.immediate(/[^\s,#"]+/), $.path)),

    regex: _ => /\/[^\s,#"]*/,

    quoted_name: _ => /"[^"\r\n]*"/,

    address: $ => choice($.ip_address, alias($._word, $.hostname)),

    ip_address: _ => token(prec(1, choice(
      /\d{1,3}(\.\d{1,3}){3}(\/\d{1,3})?/,
      /[0-9A-Fa-f]*:[0-9A-Fa-f:.]*(\/\d{1,3})?/,
    ))),

    auth_method: $ => $._word,

    auth_option: $ => seq(
      field("name", alias($._word, $.option_name)),
      "=",
      field("value", choice($.quoted_name, alias(/[^\s#"]+/, $.option_value))),
    ),

    // pg_ident.conf

    // A mapping shares its first two fields' shape with a setting and its
    // string value, so a user name in single quotes reaches the parser as a
    // string token; it is a user name, quotes and all, and is named as one.
    user_mapping: $ => seq(
      field("map", alias($._word, $.map_name)),
      field("system_user", choice(alias($._word, $.system_user), alias($.string, $.system_user), $.regex, $.quoted_name)),
      field("database_user", choice(alias($._word, $.database_user), alias($.string, $.database_user), $.quoted_name, $.backreference)),
    ),

    backreference: _ => /\\\d+/,
  },
});
