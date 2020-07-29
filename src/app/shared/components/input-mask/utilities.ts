const emptyArray = [];
const defaultPlaceholderChar = '_';
const emptyString = '';
const strFunction = 'function';

export function convertMaskToPlaceholder(mask = emptyArray, placeholderChar = defaultPlaceholderChar) {
  if (!isArray(mask)) {
    throw new Error(
      'Text-mask:convertMaskToPlaceholder; The mask property must be an array.'
    );
  }

  if (mask.indexOf(placeholderChar) !== -1) {
    throw new Error(
      'Placeholder character must not be used as part of the mask. Please specify a character ' +
      'that is not present in your mask as your placeholder character.\n\n' +
      `The placeholder character that was received is: ${JSON.stringify(placeholderChar)}\n\n` +
      `The mask that was received is: ${JSON.stringify(mask)}`
    );
  }

  return mask.map((char) => {
    return (char instanceof RegExp) ? placeholderChar : char;
  }).join('');
}

export function isArray(value) {
  return (Array.isArray && Array.isArray(value)) || value instanceof Array;
}

export function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

export function isNumber(value: any) {
  return value && value.length === undefined && typeof value === 'number' && !isNaN(value);
}

const strCaretTrap = '[]';
export function processCaretTraps(mask) {
  const indexes = [];

  let indexOfCaretTrap;
  while (indexOfCaretTrap = mask.indexOf(strCaretTrap), indexOfCaretTrap !== -1) { // eslint-disable-line
    indexes.push(indexOfCaretTrap);

    mask.splice(indexOfCaretTrap, 1);
  }

  return { maskWithoutCaretTraps: mask, indexes };
}


export function getSafeRawValue(inputValue) {
  if (isString(inputValue)) {
    return inputValue;
  } else if (isNumber(inputValue)) {
    return String(inputValue);
  } else if (inputValue === undefined || inputValue === null) {
    return emptyString;
  } else {
    throw new Error(
      'The \'value\' provided to Text Mask needs to be a string or a number. The value ' +
      `received was:\n\n ${JSON.stringify(inputValue)}`
    );
  }
}

export function safeSetSelection(element, selectionPosition) {
  if (document.activeElement === element) {
    element.setSelectionRange(selectionPosition, selectionPosition, 'none');
  }
}

export class InputMaskOptions {
  public guide = true;
  public previousConformedValue = '';
  public placeholderChar: string = defaultPlaceholderChar;
  public currentCaretPosition: any;
  public keepCharPositions?: boolean;
  public placeholder = '';
  public showMask = true;
  public keepMask = true;
  pipe?: (conformedValue: string, config: InputMaskOptions) => false | string | object;

  public constructor(init?: Partial<InputMaskOptions>) {
    Object.assign(this, init);
  }

  public update(values?: Partial<InputMaskOptions>) {
    Object.assign(this, values);
  }
}

export function conformToMask(rawValue = emptyString, mask: any = emptyArray, config: InputMaskOptions) {
  if (!isArray(mask)) {
    // If someone passes a function as the mask property, we should call the
    // function to get the mask array - Normally this is handled by the
    // `createTextMaskInputElement:update` function - this allows mask functions
    // to be used directly with `conformToMask`
    if (typeof mask === strFunction) {
      // call the mask function to get the mask array
      mask = mask(rawValue, config);

      // mask functions can setup caret traps to have some control over how the caret moves. We need to process
      // the mask for any caret traps. `processCaretTraps` will remove the caret traps from the mask
      mask = processCaretTraps(mask).maskWithoutCaretTraps;
    } else {
      throw new Error(
        'Text-mask:conformToMask; The mask property must be an array.'
      );
    }
  }

  // These configurations tell us how to conform the mask

  if (!config.placeholder) {
      config.placeholder = convertMaskToPlaceholder(mask, config.placeholderChar);
  }

  // The configs below indicate that the user wants the algorithm to work in *no guide* mode
  const suppressGuide = config.guide === false && config.previousConformedValue !== undefined;

  // Calculate lengths once for performance
  const rawValueLength = rawValue.length;
  const previousConformedValueLength = config.previousConformedValue.length;
  const placeholderLength = config.placeholder.length;
  const maskLength = mask.length;

  // This tells us the number of edited characters and the direction in which they were edited (+/-)
  const editDistance = rawValueLength - previousConformedValueLength;

  // In *no guide* mode, we need to know if the user is trying to add a character or not
  const isAddition = editDistance > 0;

  // Tells us the index of the first change. For (438) 394-4938 to (38) 394-4938, that would be 1
  const indexOfFirstChange = config.currentCaretPosition + (isAddition ? -editDistance : 0);

  // We're also gonna need the index of last change, which we can derive as follows...
  const indexOfLastChange = indexOfFirstChange + Math.abs(editDistance);

  // If `conformToMask` is configured to keep character positions, that is, for mask 111, previous value
  // _2_ and raw value 3_2_, the new conformed value should be 32_, not 3_2 (default behavior). That's in the case of
  // addition. And in the case of deletion, previous value _23, raw value _3, the new conformed string should be
  // __3, not _3_ (default behavior)
  //
  // The next block of logic handles keeping character positions for the case of deletion. (Keeping
  // character positions for the case of addition is further down since it is handled differently.)
  // To do this, we want to compensate for all characters that were deleted
  if (config.keepCharPositions === true && !isAddition) {
    // We will be storing the new placeholder characters in this variable.
    let compensatingPlaceholderChars = emptyString;

    // For every character that was deleted from a placeholder position, we add a placeholder char
    for (let i = indexOfFirstChange; i < indexOfLastChange; i++) {
      if (config.placeholder[i] === config.placeholderChar) {
        compensatingPlaceholderChars += config.placeholderChar;
      }
    }

    // Now we trick our algorithm by modifying the raw value to make it contain additional placeholder characters
    // That way when the we start laying the characters again on the mask, it will keep the non-deleted characters
    // in their positions.
    rawValue = (
      rawValue.slice(0, indexOfFirstChange) +
      compensatingPlaceholderChars +
      rawValue.slice(indexOfFirstChange, rawValueLength)
    );
  }

  // Convert `rawValue` string to an array, and mark characters based on whether they are newly added or have
  // existed in the previous conformed value. Identifying new and old characters is needed for `conformToMask`
  // to work if it is configured to keep character positions.
  const rawValueArr = rawValue
    .split(emptyString)
    .map((char, i) => ({ char, isNew: i >= indexOfFirstChange && i < indexOfLastChange }));

  // The loop below removes masking characters from user input. For example, for mask
  // `00 (111)`, the placeholder would be `00 (___)`. If user input is `00 (234)`, the loop below
  // would remove all characters but `234` from the `rawValueArr`. The rest of the algorithm
  // then would lay `234` on top of the available placeholder positions in the mask.
  for (let i = rawValueLength - 1; i >= 0; i--) {
    const { char } = rawValueArr[i];

    if (char !== config.placeholderChar) {
      const shouldOffset = i >= indexOfFirstChange && previousConformedValueLength === maskLength;

      if (char === config.placeholder[(shouldOffset) ? i - editDistance : i]) {
        rawValueArr.splice(i, 1);
      }
    }
  }

  // This is the variable that we will be filling with characters as we figure them out
  // in the algorithm below
  let conformedValue = emptyString;
  let someCharsRejected = false;

  // Ok, so first we loop through the placeholder looking for placeholder characters to fill up.
  placeholderLoop: for (let i = 0; i < placeholderLength; i++) {
    const charInPlaceholder = config.placeholder[i];

    // We see one. Let's find out what we can put in it.
    if (charInPlaceholder === config.placeholderChar) {
      // But before that, do we actually have any user characters that need a place?
      if (rawValueArr.length > 0) {
        // We will keep chipping away at user input until either we run out of characters
        // or we find at least one character that we can map.
        while (rawValueArr.length > 0) {
          // Let's retrieve the first user character in the queue of characters we have left
          const { char: rawValueChar, isNew } = rawValueArr.shift();

          // If the character we got from the user input is a placeholder character (which happens
          // regularly because user input could be something like (540) 90_-____, which includes
          // a bunch of `_` which are placeholder characters) and we are not in *no guide* mode,
          // then we map this placeholder character to the current spot in the placeholder
          if (rawValueChar === config.placeholderChar && suppressGuide !== true) {
            conformedValue += config.placeholderChar;

            // And we go to find the next placeholder character that needs filling
            continue placeholderLoop;

            // Else if, the character we got from the user input is not a placeholder, let's see
            // if the current position in the mask can accept it.
          } else if (mask[i].test(rawValueChar)) {
            // we map the character differently based on whether we are keeping character positions or not.
            // If any of the conditions below are met, we simply map the raw value character to the
            // placeholder position.
            if (
              config.keepCharPositions !== true ||
              isNew === false ||
              config.previousConformedValue === emptyString ||
              config.guide === false ||
              !isAddition
            ) {
              conformedValue += rawValueChar;
            } else {
              // We enter this block of code if we are trying to keep character positions and none of the conditions
              // above is met. In this case, we need to see if there's an available spot for the raw value character
              // to be mapped to. If we couldn't find a spot, we will discard the character.
              //
              // For example, for mask `1111`, previous conformed value `_2__`, raw value `942_2__`. We can map the
              // `9`, to the first available placeholder position, but then, there are no more spots available for the
              // `4` and `2`. So, we discard them and end up with a conformed value of `92__`.
              const rawValueArrLength = rawValueArr.length;
              let indexOfNextAvailablePlaceholderChar = null;

              // Let's loop through the remaining raw value characters. We are looking for either a suitable spot, ie,
              // a placeholder character or a non-suitable spot, ie, a non-placeholder character that is not new.
              // If we see a suitable spot first, we store its position and exit the loop. If we see a non-suitable
              // spot first, we exit the loop and our `indexOfNextAvailablePlaceholderChar` will stay as `null`.
              for (let i = 0; i < rawValueArrLength; i++) {
                const charData = rawValueArr[i];

                if (charData.char !== config.placeholderChar && charData.isNew === false) {
                  break;
                }

                if (charData.char === config.placeholderChar) {
                  indexOfNextAvailablePlaceholderChar = i;
                  break;
                }
              }

              // If `indexOfNextAvailablePlaceholderChar` is not `null`, that means the character is not blocked.
              // We can map it. And to keep the character positions, we remove the placeholder character
              // from the remaining characters
              if (indexOfNextAvailablePlaceholderChar !== null) {
                conformedValue += rawValueChar;
                rawValueArr.splice(indexOfNextAvailablePlaceholderChar, 1);

                // If `indexOfNextAvailablePlaceholderChar` is `null`, that means the character is blocked. We have to
                // discard it.
              } else {
                i--;
              }
            }

            // Since we've mapped this placeholder position. We move on to the next one.
            continue placeholderLoop;
          } else {
            someCharsRejected = true;
          }
        }
      }

      // We reach this point when we've mapped all the user input characters to placeholder
      // positions in the mask. In *guide* mode, we append the left over characters in the
      // placeholder to the `conformedString`, but in *no guide* mode, we don't wanna do that.
      //
      // That is, for mask `(111)` and user input `2`, we want to return `(2`, not `(2__)`.
      if (suppressGuide === false) {
        conformedValue += config.placeholder.substr(i, placeholderLength);
      }

      // And we break
      break;

      // Else, the charInPlaceholder is not a placeholderChar. That is, we cannot fill it
      // with user input. So we just map it to the final output
    } else {
      conformedValue += charInPlaceholder;
    }
  }

  // The following logic is needed to deal with the case of deletion in *no guide* mode.
  //
  // Consider the silly mask `(111) /// 1`. What if user tries to delete the last placeholder
  // position? Something like `(589) /// `. We want to conform that to `(589`. Not `(589) /// `.
  // That's why the logic below finds the last filled placeholder character, and removes everything
  // from that point on.
  if (suppressGuide && isAddition === false) {
    let indexOfLastFilledPlaceholderChar = null;

    // Find the last filled placeholder position and substring from there
    for (let i = 0; i < conformedValue.length; i++) {
      if (config.placeholder[i] === config.placeholderChar) {
        indexOfLastFilledPlaceholderChar = i;
      }
    }

    if (indexOfLastFilledPlaceholderChar !== null) {
      // We substring from the beginning until the position after the last filled placeholder char.
      conformedValue = conformedValue.substr(0, indexOfLastFilledPlaceholderChar + 1);
    } else {
      // If we couldn't find `indexOfLastFilledPlaceholderChar` that means the user deleted
      // the first character in the mask. So we return an empty string.
      conformedValue = emptyString;
    }
  }

  return { conformedValue, meta: { someCharsRejected } };
}


export function adjustCaretPosition({
  previousConformedValue = emptyString,
  previousPlaceholder = emptyString,
  currentCaretPosition = 0,
  conformedValue,
  rawValue,
  placeholderChar,
  placeholder,
  indexesOfPipedChars = [],
  caretTrapIndexes = []
}) {
  if (currentCaretPosition === 0 || !rawValue.length) { return 0; }

  // Store lengths for faster performance?
  const rawValueLength = rawValue.length;
  const previousConformedValueLength = previousConformedValue.length;
  const placeholderLength = placeholder.length;
  const conformedValueLength = conformedValue.length;

  // This tells us how long the edit is. If user modified input from `(2__)` to `(243__)`,
  // we know the user in this instance pasted two characters
  const editLength = rawValueLength - previousConformedValueLength;

  // If the edit length is positive, that means the user is adding characters, not deleting.
  const isAddition = editLength > 0;

  // This is the first raw value the user entered that needs to be conformed to mask
  const isFirstRawValue = previousConformedValueLength === 0;

  // A partial multi-character edit happens when the user makes a partial selection in their
  // input and edits that selection. That is going from `(123) 432-4348` to `() 432-4348` by
  // selecting the first 3 digits and pressing backspace.
  //
  // Such cases can also happen when the user presses the backspace while holding down the ALT
  // key.
  const isPartialMultiCharEdit = editLength > 1 && !isAddition && !isFirstRawValue;

  // This algorithm doesn't support all cases of multi-character edits, so we just return
  // the current caret position.
  //
  // This works fine for most cases.
  if (isPartialMultiCharEdit) { return currentCaretPosition; }

  // For a mask like (111), if the `previousConformedValue` is (1__) and user attempts to enter
  // `f` so the `rawValue` becomes (1f__), the new `conformedValue` would be (1__), which is the
  // same as the original `previousConformedValue`. We handle this case differently for caret
  // positioning.
  const possiblyHasRejectedChar = isAddition && (
    previousConformedValue === conformedValue ||
    conformedValue === placeholder
  );

  let startingSearchIndex = 0;
  let trackRightCharacter;
  let targetChar;

  if (possiblyHasRejectedChar) {
    startingSearchIndex = currentCaretPosition - editLength;
  } else {
    // At this point in the algorithm, we want to know where the caret is right before the raw input
    // has been conformed, and then see if we can find that same spot in the conformed input.
    //
    // We do that by seeing what character lies immediately before the caret, and then look for that
    // same character in the conformed input and place the caret there.

    // First, we need to normalize the inputs so that letter capitalization between raw input and
    // conformed input wouldn't matter.
    const normalizedConformedValue = conformedValue.toLowerCase();
    const normalizedRawValue = rawValue.toLowerCase();

    // Then we take all characters that come before where the caret currently is.
    const leftHalfChars = normalizedRawValue.substr(0, currentCaretPosition).split(emptyString);

    // Now we find all the characters in the left half that exist in the conformed input
    // This step ensures that we don't look for a character that was filtered out or rejected by `conformToMask`.
    const intersection = leftHalfChars.filter((char) => normalizedConformedValue.indexOf(char) !== -1);

    // The last character in the intersection is the character we want to look for in the conformed
    // value and the one we want to adjust the caret close to
    targetChar = intersection[intersection.length - 1];

    // Calculate the number of mask characters in the previous placeholder
    // from the start of the string up to the place where the caret is
    const previousLeftMaskChars = previousPlaceholder
      .substr(0, intersection.length)
      .split(emptyString)
      .filter(char => char !== placeholderChar)
      .length;

    // Calculate the number of mask characters in the current placeholder
    // from the start of the string up to the place where the caret is
    const leftMaskChars = placeholder
      .substr(0, intersection.length)
      .split(emptyString)
      .filter(char => char !== placeholderChar)
      .length;

    // Has the number of mask characters up to the caret changed?
    const masklengthChanged = leftMaskChars !== previousLeftMaskChars;

    // Detect if `targetChar` is a mask character and has moved to the left
    const targetIsMaskMovingLeft = (
      previousPlaceholder[intersection.length - 1] !== undefined &&
      placeholder[intersection.length - 2] !== undefined &&
      previousPlaceholder[intersection.length - 1] !== placeholderChar &&
      previousPlaceholder[intersection.length - 1] !== placeholder[intersection.length - 1] &&
      previousPlaceholder[intersection.length - 1] === placeholder[intersection.length - 2]
    );

    // If deleting and the `targetChar` `is a mask character and `masklengthChanged` is true
    // or the mask is moving to the left, we can't use the selected `targetChar` any longer
    // if we are not at the end of the string.
    // In this case, change tracking strategy and track the character to the right of the caret.
    if (
      !isAddition &&
      (masklengthChanged || targetIsMaskMovingLeft) &&
      previousLeftMaskChars > 0 &&
      placeholder.indexOf(targetChar) > -1 &&
      rawValue[currentCaretPosition] !== undefined
    ) {
      trackRightCharacter = true;
      targetChar = rawValue[currentCaretPosition];
    }

    // It is possible that `targetChar` will appear multiple times in the conformed value.
    // We need to know not to select a character that looks like our target character from the placeholder or
    // the piped characters, so we inspect the piped characters and the placeholder to see if they contain
    // characters that match our target character.

    // If the `conformedValue` got piped, we need to know which characters were piped in so that when we look for
    // our `targetChar`, we don't select a piped char by mistake
    const pipedChars = indexesOfPipedChars.map((index) => normalizedConformedValue[index]);

    // We need to know how many times the `targetChar` occurs in the piped characters.
    const countTargetCharInPipedChars = pipedChars.filter((char) => char === targetChar).length;

    // We need to know how many times it occurs in the intersection
    const countTargetCharInIntersection = intersection.filter((char) => char === targetChar).length;

    // We need to know if the placeholder contains characters that look like
    // our `targetChar`, so we don't select one of those by mistake.
    const countTargetCharInPlaceholder = placeholder
      .substr(0, placeholder.indexOf(placeholderChar))
      .split(emptyString)
      .filter((char, index) => (
        // Check if `char` is the same as our `targetChar`, so we account for it
        char === targetChar &&

        // but also make sure that both the `rawValue` and placeholder don't have the same character at the same
        // index because if they are equal, that means we are already counting those characters in
        // `countTargetCharInIntersection`
        rawValue[index] !== char
      ))
      .length;

    // The number of times we need to see occurrences of the `targetChar` before we know it is the one we're looking
    // for is:
    const requiredNumberOfMatches = (
      countTargetCharInPlaceholder +
      countTargetCharInIntersection +
      countTargetCharInPipedChars +
      // The character to the right of the caret isn't included in `intersection`
      // so add one if we are tracking the character to the right
      (trackRightCharacter ? 1 : 0)
    );

    // Now we start looking for the location of the `targetChar`.
    // We keep looping forward and store the index in every iteration. Once we have encountered
    // enough occurrences of the target character, we break out of the loop
    // If are searching for the second `1` in `1214`, `startingSearchIndex` will point at `4`.
    let numberOfEncounteredMatches = 0;
    for (let i = 0; i < conformedValueLength; i++) {
      const conformedValueChar = normalizedConformedValue[i];

      startingSearchIndex = i + 1;

      if (conformedValueChar === targetChar) {
        numberOfEncounteredMatches++;
      }

      if (numberOfEncounteredMatches >= requiredNumberOfMatches) {
        break;
      }
    }
  }

  // At this point, if we simply return `startingSearchIndex` as the adjusted caret position,
  // most cases would be handled. However, we want to fast forward or rewind the caret to the
  // closest placeholder character if it happens to be in a non-editable spot. That's what the next
  // logic is for.

  // In case of addition, we fast forward.
  if (isAddition) {
    // We want to remember the last placeholder character encountered so that if the mask
    // contains more characters after the last placeholder character, we don't forward the caret
    // that far to the right. Instead, we stop it at the last encountered placeholder character.
    let lastPlaceholderChar = startingSearchIndex;

    for (let i = startingSearchIndex; i <= placeholderLength; i++) {
      if (placeholder[i] === placeholderChar) {
        lastPlaceholderChar = i;
      }

      if (
        // If we're adding, we can position the caret at the next placeholder character.
        placeholder[i] === placeholderChar ||

        // If a caret trap was set by a mask function, we need to stop at the trap.
        caretTrapIndexes.indexOf(i) !== -1 ||

        // This is the end of the placeholder. We cannot move any further. Let's put the caret there.
        i === placeholderLength
      ) {
        return lastPlaceholderChar;
      }
    }
  } else {
    // In case of deletion, we rewind.
    if (trackRightCharacter) {
      // Searching for the character that was to the right of the caret
      // We start at `startingSearchIndex` - 1 because it includes one character extra to the right
      for (let i = startingSearchIndex - 1; i >= 0; i--) {
        // If tracking the character to the right of the cursor, we move to the left until
        // we found the character and then place the caret right before it

        if (
          // `targetChar` should be in `conformedValue`, since it was in `rawValue`, just
          // to the right of the caret
          conformedValue[i] === targetChar ||

          // If a caret trap was set by a mask function, we need to stop at the trap.
          caretTrapIndexes.indexOf(i) !== -1 ||

          // This is the beginning of the placeholder. We cannot move any further.
          // Let's put the caret there.
          i === 0
        ) {
          return i;
        }
      }
    } else {
      // Searching for the first placeholder or caret trap to the left

      for (let i = startingSearchIndex; i >= 0; i--) {
        // If we're deleting, we stop the caret right before the placeholder character.
        // For example, for mask `(111) 11`, current conformed input `(456) 86`. If user
        // modifies input to `(456 86`. That is, they deleted the `)`, we place the caret
        // right after the first `6`

        if (
          // If we're deleting, we can position the caret right before the placeholder character
          placeholder[i - 1] === placeholderChar ||

          // If a caret trap was set by a mask function, we need to stop at the trap.
          caretTrapIndexes.indexOf(i) !== -1 ||

          // This is the beginning of the placeholder. We cannot move any further.
          // Let's put the caret there.
          i === 0
        ) {
          return i;
        }
      }
    }
  }
}
