<a name="4.0.0"></a>
# [4.0.0](https://github.com/mangalam-research/salve-dom/compare/3.0.0...4.0.0) (2018-08-07)


### build

* upgrade packages used for building salve ([f27064b](https://github.com/mangalam-research/salve-dom/commit/f27064b))


### Features

* compile to es6 ([065caca](https://github.com/mangalam-research/salve-dom/commit/065caca))
* export salve-dom's version number ([74d0dd6](https://github.com/mangalam-research/salve-dom/commit/74d0dd6))


### BREAKING CHANGES

* The upgrade to salve 8 entails that we no longer support IE11 and Safari 9
because salve 8 does not support them. See salve's CHANGELOG.md file if you need
the gory details.



3.0.0:

 - Upgrade to salve 7.0.0.

 - Fix: the documentation for ``possibleWhere`` already mentioned
   (periphrastically) that passing an event with name patterns is not
   allowed. (For instance, you may not pass ``new Event("enterStartTag", new
   Name("", "", "foo"))``. You have to pass ``new Event("enterStartTag", "",
   "foo")`` instead.) In fact, the method did not guard against it and would
   sometimes work even if passed an event with a name pattern. The prohibition
   has been clarified and the method will now fail hard if passed an event with
   a name pattern in it.

2.0.1:

 - Fixed an error with ``safeParse``. If a document was partially parsable, it
   would not detect the parsing error.

2.0.0:

 - Fixed errors with ``safeParse`` on IE11 and Edge.

   We used to use ``karma-typescript-preprocessor``, which is awful. Among other
   things, it would not report compilation errors but would let Karma run tests
   on code that does not compile cleanly. This resulted in errors in
   ``safeParse`` being hidden. We switched to a good preprocessor, and fixed the
   errors.

 - Dropped support for IE10. It was supported because it was a no-cost
   proposition. Adding ``safeParse`` requires custom exceptions, which cannot be
   readily created on IE10 with TypeScript. (See
   [this](https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work).)

   Since IE10 has reached end-of-life a while ago, we cannot justify spending
   time fixing issues that occur only on IE10.

 - Prevent error duplication.

   There was an issue whereby if you used any of the methods that call
   ``_getWalkerAt``, it would be possible to get duplicated errors. One
   prominent example was when using ``possibleAt``. If producing the result
   required replaying events then any event generating an error would generate
   the error anew, and a duplicate error would be recorded. (With an
   accompanying duplicate event.)

   salve-dom now checks whether an error was previously seen, and will not
   record it and generate a new event if it has already been seen.

   Implementation note: it would be tempting to declare that while
   ``_getWalkerAt`` runs, no errors should be processed. This would eliminate
   the need to detect duplicates, but it would create a slew of other issues.

1.3.0:

 - Added ``safeParse``.

1.2.0:

 - Added ``unresolveNameAt`` and ``resolveNameAt``.

1.1.1:

 - Fixed an error in ``_validateUpTo``. If it was called to validate up to the
   attributes of an element, and this element had a previous sibling, it would
   not validate up to where it should, causing ``_getWalkerAt`` to crash. This,
   in turn, could cause ``possibleAt`` and ``speculativelyValidateFragment`` to
   crash too.

1.1.0:

 - Added a ``resetTo`` method that allows to do the work of ``restartAt``
   without actually restarting the validation.

1.0.0: Initial release.
