---
sidebar_position: 3
---

# AAC Beacon — Source Documentation

---

# `tts.js`

## `speak(text)`

Speaks the given text aloud using the device's speech engine. Stops any currently playing speech before starting. Does nothing if `text` is empty or whitespace.

* **Parameters:** `text` — `string` representing the text to be spoken
* **Options:** language `en-US`, rate `0.9`, pitch `1.0`

## `stop()`

Stops any currently playing speech immediately.

---

# `WordGrid.js`

## `default function WordGrid({ words, activeCategoryColor, onAddWord })`

A scrollable grid of word tiles. Each tile displays an emoji and a label and triggers a callback when pressed.

* **Parameters:**
  * `words` — `Array<{ label: string, emoji: string }>` list of words to display as tiles
  * `activeCategoryColor` — `string` hex color used for tile background tint and border
  * `onAddWord` — `(label: string) => void` callback invoked when a tile is pressed

---

# `SentenceBar.js`

## `default function SentenceBar({ sentence, onRemoveLastWord, onClearSentence, onSpeakSentence })`

A horizontal bar displaying the currently built sentence along with action buttons for editing and speaking it. Shows a placeholder message when the sentence is empty.

* **Parameters:**
  * `sentence` — `string[]` array of words making up the current sentence
  * `onRemoveLastWord` — `() => void` callback to remove the last word in the sentence
  * `onClearSentence` — `() => void` callback to clear all words from the sentence
  * `onSpeakSentence` — `() => void` callback to speak the full sentence aloud

---

# `RoomSelector.js`

## `default function RoomSelector({ rooms, activeRoomId, onSelectRoom })`

A horizontally scrollable row of room "chips" that lets the user manually simulate entering a room. This component is a placeholder for automatic Bluetooth beacon detection. Once BLE is integrated, this selector can be hidden or shown only as a manual override / fallback.

* **Parameters:**
  * `rooms` — `Array<{ id: string, label: string, emoji: string, color: string }>` list of available rooms
  * `activeRoomId` — `string | null` the ID of the currently selected room, or `null` for General
  * `onSelectRoom` — `(roomId: string | null) => void` callback invoked when a chip is pressed

---

# `InteractionLogModal.js`

## `formatTimestamp(value)`

Converts a timestamp value to a human-readable locale string. Returns the original value if it cannot be parsed as a valid date.

* **Parameters:** `value` — a date string or timestamp
* **Returns:** `string` formatted locale date/time string

## `renderLogItem({ item, index })`

Renders a single interaction log entry card. Displays button name, timestamp, room, device ID, and optional fields such as word, sentence length, and category.

* **Parameters:**
  * `item` — a log entry object
  * `index` — `number` the position of the item in the list

## `default function InteractionLogModal({ visible, logs, onClose })`

A full-screen modal that displays the interaction log history in reverse chronological order. Supports exporting all logs as a JSON file (download on web, native share sheet on mobile).

* **Parameters:**
  * `visible` — `boolean` controls modal visibility
  * `logs` — `Array` of interaction log entry objects
  * `onClose` — `() => void` callback to close the modal

### `handleExportJson()`

Exports the current logs as a JSON payload. On web, triggers a file download. On native platforms, opens the system share sheet. Disables the export button while exporting is in progress.

---

# `CategoryTabs.js`

## `default function CategoryTabs({ categories, activeCategory, categoryColors, onSelectCategory })`

Renders a row of category tab buttons. The active tab is highlighted with its assigned category color.

* **Parameters:**
  * `categories` — `object` whose keys are category name strings
  * `activeCategory` — `string` the currently selected category key
  * `categoryColors` — `object` mapping category keys to hex color strings
  * `onSelectCategory` — `(category: string) => void` callback invoked when a tab is pressed

---

# `AppHeader.js`

## `default function AppHeader({ currentRoom, onViewLogs })`

Renders the top header bar showing the app title, the current room context, and a button to open the interaction logs modal.

* **Parameters:**
  * `currentRoom` — `{ emoji: string, label: string } | null` the active room object, or `null` for General
  * `onViewLogs` — `() => void` callback invoked when the "View Logs" button is pressed

---

# `useSpeech.js`

## `useSpeech()`

Custom hook that exposes TTS controls to components.

* **Returns:**
  * `speakText(text: string) => void` — speaks the given text
  * `stopSpeech() => void` — stops any currently playing speech

---

# `useSentenceBuilder.js`

## `default function useSentenceBuilder({ onLogPress })`

Custom hook that manages sentence state and logs all sentence-related user interactions. Intended as the primary sentence-building hook when interaction logging is needed.

* **Parameters:**
  * `onLogPress` — `(buttonName: string, metadata?: object) => void` optional callback used to log each action

* **Returns:**
  * `sentence` — `string[]` the current array of words
  * `addWord(word: string) => void` — appends a word to the sentence and logs a `word_tile` press
  * `removeLastWord() => void` — removes the last word and logs a `remove_last_word` press
  * `clearSentence() => void` — clears all words and logs a `clear_sentence` press
  * `speakSentence() => void` — shows an alert with the full sentence and logs a `speak_sentence` press; no-op if sentence is empty

---

# `useSentence.js`

## `useSentence()`

Custom hook that manages sentence state with integrated TTS feedback. Speaks each word immediately when added and speaks the full sentence on demand.

* **Returns:**
  * `sentence` — `string[]` the current array of words
  * `addWord(word: string) => void` — appends a word and immediately speaks it
  * `speakSentence() => void` — speaks the entire sentence joined by spaces
  * `clear() => void` — clears all words and stops any ongoing speech

---

# `useLocationDetection.js`

## `default function useLocationDetection()`

Abstraction layer for room / location detection. Currently supports manual room selection. Designed so that future Bluetooth beacon scanning can be swapped in without changing the hook's return shape or the rest of the app.

* **Returns:**
  * `currentRoom` — `object | null` the active room context object
  * `detectionMode` — `'manual' | 'bluetooth'` the current detection strategy
  * `setRoomManually(roomId: string | null) => void` — sets the active room by ID; pass `null` to clear
  * `allRooms` — `Array` all available room definitions

### `setRoomManually(roomId)`

Looks up a room by ID from the full room list and sets it as the current room. Clears the current room if `null` is passed.

* **Parameters:** `roomId` — `string | null`

---

# `useInteractionLogger.js`

## `createDeviceId()`

Generates a pseudo-unique device identifier string combining the platform OS, platform version, and a random alphanumeric suffix.

* **Returns:** `string` in the format `{os}-{version}-{randomSuffix}`

## `default function useInteractionLogger(currentRoom)`

Custom hook that maintains a log of user interaction events. Each entry captures the button name, timestamp, device ID, room context, and any additional metadata.

* **Parameters:** `currentRoom` — `object | null` the currently active room, used to attach location context to each log entry

* **Returns:**
  * `deviceId` — `string` the stable pseudo-unique device identifier for this session
  * `interactionLogs` — `Array` the full list of recorded log entries
  * `logButtonPress(buttonName: string, metadata?: object) => void` — records a new interaction entry and prints it to the console

### `logButtonPress(buttonName, metadata)`

Creates and appends a new log entry to `interactionLogs`. The entry includes device ID, button name, ISO timestamp, location (derived from `currentRoom`), and any extra fields provided in `metadata`.

* **Parameters:**
  * `buttonName` — `string` the identifier of the button or action that was triggered
  * `metadata` — `object` optional additional fields to merge into the log entry (e.g. `{ word, sentenceLength, category }`)
</ul>
</li>
<li class=""><strong>Returns:</strong> <code>double</code></li>
</ul></div><footer class="theme-doc-footer docusaurus-mt-lg"><div class="row margin-top--sm theme-doc-footer-edit-meta-row"><div class="col noPrint_WFHX"><a href="https://github.com/Capstone-Projects-2026-spring/project-professional-group-one-llc/edit/main/documentation/docs/api-specification/calculator-model-generated.md" target="_blank" rel="noopener noreferrer" class="theme-edit-this-page"><svg fill="currentColor" height="20" width="20" viewBox="0 0 40 40" class="iconEdit_Z9Sw" aria-hidden="true"><g><path d="m34.5 11.7l-3 3.1-6.3-6.3 3.1-3q0.5-0.5 1.2-0.5t1.1 0.5l3.9 3.9q0.5 0.4 0.5 1.1t-0.5 1.2z m-29.5 17.1l18.4-18.5 6.3 6.3-18.4 18.4h-6.3v-6.2z"></path></g></svg>Edit this page</a></div><div class="col lastUpdated_JAkA"><details><summary>Revision History</summary><table><thead><tr><th scope="row">Author</th><th scope="row">Revision</th><th scope="row">Date</th></tr></thead><tbody><tr><td colspan="3" style="text-align:center;font-style:italic;color:#666">Loading...</td></tr></tbody></table></details><span class="theme-last-updated">Last updated<!-- --> by <b>Walid Parsat</b></span></div></div></footer></article><nav class="docusaurus-mt-lg pagination-nav" aria-label="Docs pages"><a class="pagination-nav__link pagination-nav__link--prev" href="/project-professional-group-one-llc/docs/api-specification/openapi-spec"><div class="pagination-nav__sublabel">Previous</div><div class="pagination-nav__label">API 1 - Swagger Petstore</div></a><a class="pagination-nav__link pagination-nav__link--next" href="/project-professional-group-one-llc/docs/category/test-procedures"><div class="pagination-nav__sublabel">Next</div><div class="pagination-nav__label">Test Procedures</div></a></nav></div></div><div class="col col--3"><div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop"><ul class="table-of-contents table-of-contents__left-border"><li><a href="#public-class-calculatormodel" class="table-of-contents__link toc-highlight"><code>public class CalculatorModel</code></a></li><li><a href="#private-double-displayvalue" class="table-of-contents__link toc-highlight"><code>private double displayValue</code></a></li><li><a href="#private-double-internalvalue" class="table-of-contents__link toc-highlight"><code>private double internalValue</code></a></li><li><a href="#private-string-displaystring" class="table-of-contents__link toc-highlight"><code>private String displayString</code></a></li><li><a href="#private-string-operation" class="table-of-contents__link toc-highlight"><code>private String operation</code></a></li><li><a href="#private-boolean-start" class="table-of-contents__link toc-highlight"><code>private boolean start</code></a></li><li><a href="#private-boolean-dot" class="table-of-contents__link toc-highlight"><code>private boolean dot</code></a></li><li><a href="#public-calculatormodel" class="table-of-contents__link toc-highlight"><code>public CalculatorModel()</code></a></li><li><a href="#public-string-getvalue" class="table-of-contents__link toc-highlight"><code>public String getValue()</code></a></li><li><a href="#public-void-updatestring-text" class="table-of-contents__link toc-highlight"><code>public void update(String text)</code></a></li><li><a href="#public-double-operationadddouble-rhs-double-lhs" class="table-of-contents__link toc-highlight"><code>public double operationAdd(double rhs, double lhs)</code></a></li></ul></div></div></div></div></main></div></div></div><footer class="theme-layout-footer footer"><div class="container container-fluid"><div class="row footer__links"><div class="theme-layout-footer-column col footer__col"><div class="footer__title">Docs</div><ul class="footer__items clean-list"><li class="footer__item"><a class="footer__link-item" href="/project-professional-group-one-llc/docs/intro">Documentation</a></li></ul></div><div class="theme-layout-footer-column col footer__col"><div class="footer__title">More</div><ul class="footer__items clean-list"><li class="footer__item"><a href="https://github.com/Capstone-Projects-2026-spring/project-professional-group-one-llc" target="_blank" rel="noopener noreferrer" class="footer__link-item">GitHub<svg width="13.5" height="13.5" aria-label="(opens in new tab)" class="iconExternalLink_nPIU"><use href="#theme-svg-external-link"></use></svg></a></li><li class="footer__item"><a class="footer__link-item" href="/project-professional-group-one-llc/tutorial/open-source-usage">Template Contributors</a></li></ul></div></div><div class="footer__bottom text--center"><div class="margin-bottom--sm"><img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Temple_T_logo.svg" alt="My Site Logo" class="footer__logo themedComponent_mlkZ themedComponent--light_NVdE"><img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Temple_T_logo.svg" alt="My Site Logo" class="footer__logo themedComponent_mlkZ themedComponent--dark_xIcU"></div><div class="footer__copyright">Copyright © 2026 Project Professional Group One Llc, Inc. Built with Docusaurus.</div></div></div></footer></div>
</body>
</html>
