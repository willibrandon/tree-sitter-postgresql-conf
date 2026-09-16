# tree-sitter-postgresql-conf

A [tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for PostgreSQL's configuration files: `postgresql.conf` and `postgresql.auto.conf`, `pg_hba.conf` and `pg_ident.conf`. One grammar covers all three because their lines never look alike: a setting is a name and one value, a `pg_hba.conf` rule starts with a connection type, and a `pg_ident.conf` map has three bare fields.

The tree keeps what an editor or tool would want to ask about. A `setting` has a `name` and a `value`, which is a `string`, a `number` with an optional `unit`, a `boolean` or a `bare_value`. An `hba_rule` has a `type`, a `database` and a `user` list, an `address` with an optional `netmask`, a `method` and any `auth_option`s. A `user_mapping` has a `map`, a `system_user` and a `database_user`. Includes, comments, role groups, file references, patterns and quoted names all get their own nodes.

`queries/highlights.scm` uses the standard capture names, and `queries/textobjects.scm` marks settings, rules, maps and options. Editor packages for Neovim, Helix and Zed live with the [Postern](https://github.com/willibrandon/postern) language server, which pairs with this grammar.

Development needs the tree-sitter CLI, Node and a C compiler.

    tree-sitter generate
    tree-sitter test

The generated parser in `src/` is committed, so editors can build the grammar without the CLI.
