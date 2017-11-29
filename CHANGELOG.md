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
