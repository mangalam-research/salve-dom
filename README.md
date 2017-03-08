salve-dom is a library able to validate XML documents stored in DOM trees
according to a Relax NG schema. It uses
[salve](https://github.com/mangalam-research/salve) to perform the validation
and has the same general limitations. This library was extracted from the
[wed](https://github.com/mangalam-research/wed) XML editor. The algorithms used
here have been in production for years.

Note that the validation facilities provided by this library are geared towards
validating a document while it is being edited. The API provides functions that
are meaningful in that kind of context. However, there's nothing that prevents
using this library to perform a "batch" validation of the kind you'd do by
running a validator at the command line (for instance).

Using
=====

The library is written in TypeScript but can be used by JavaScript code. The wed
editor mentioned above is still implemented in ES5 and uses `salve-dom` without
problem.

However, if you are using JavaScript you should pay close attention to what is
public and what is not public in the API. **Anything that the TypeScript type
annotations do not expose to TypeScript code is private.** Relying on private
parts of the code is unsupported.

The nitty-gritty details are in the ``typedoc`` comments that addorn the source
code. You should rely on these. Note that ``typedoc`` is still at an early stage
of development compared to tools like JSDoc. Some of the documentation tags are
not recognized by ``typedoc`` but are nonetheless used to record useful
information.

The big picture:

* You create a ``Validator`` object that will validate a DOM tree according to
  your Relax NG schema. Let's say your new validator is ``validator``.

* You start it with ``validator.start()``.

* You listen for events on ``validator.events``.

* You can stop it before it is done with ``validator.stop()``.

* The current state of validation is available with
  ``validator.getWorkingState()`` and ``validator.errors``.

* Editors that do validation during editing will want to use methods like
  ``possibleAt, possibleWhere, speculativelyValidate, etc.``

* The ``Validator`` class calls a method named ``_runDocumentValidation`` when
  it is done with a document. The default implementation of
  ``_runDocumentValidation`` is a no-op. A class extending ``Validator`` could
  override this protected method to perform validation that cannot be modeled in
  Relax NG. The implementation may call the protected method ``_processError``
  to add errors to the validation results.

Browser Requirements
====================

salve-dom passes its test suite on:

* Chrome, Firefox, IE 10/11, Edge, Opera and Safari form Mavericks onwards. It
  has been tested on "relatively recent versions".

Your browser must have support for ``firstElementChild`` and its associated
properties on nodes that implement the ``Document``, ``Element`` and
``CharacterData`` interfaces. If your target browser does not have this, then
**you need a polyfill that provides it.** Chrome and Firefox have not needed
such polyfill for a long time but IE and Edge need it. (Such polyfill is
included in the ``polyfills`` subdirectory.)

Loading
=======

Two general options:

1. Load it as a UMD module. You must use the ``salve-dom*.js`` bundles in the
   root of the installed package. This probably your best bet if you want to use
   the library "as-is". The ``salve`` module is required by these bundles, so it
   must be available through whatever module loader you use.

2. Load it as a collection of modules. You'll find the modules in the ``lib``
   subdirectory of the installed package. These modules are in the CommonJS
   format. This allows creating custom bundles (e.g. combine salve-dom and salve
   in a single bundle).
