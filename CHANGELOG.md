1.4.0:

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
