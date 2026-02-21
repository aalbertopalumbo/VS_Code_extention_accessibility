<details open>
  <summary>
    <h3>1. Name functions as the user expects them</h3> 
  </summary>

  Common functions such as search, sign-in, log-out should use already established wording to provide users with a familiar experience.

**What to do:** check the labels to asses whether the function uses clear language that follows established wordings. 

**Examples:**
- Sign-in: sign-in, log-in
- Sign-up: sign-up, register, subscribe
- Log-out: log-out, sign-out, exit 
- Save: save 
- Abort an operation: cancel
- Delete: delete, remove, delete *name of the to-be deleted item*, remove *name of the to-be deleted item*
- Reload: reload, refresh, 

    **Examples:**
  ```HTML
  <!-- Check text-level semantic elements that should use standard wording-->
  <a href="#"> Sign-up </a>
  <button> log-in </button>

  ```

<details open> 
  <summary> 
    <h3 style="display:inline-block"> 2.	Users should be able to use different expressions and synonyms to mean the same thing. Relative statements like "today", "at the earliest time" are possibile 
    </h3> 
  </summary>

When referring to a link or item present in the page, users should be able to not use the exact phrasing to refer to a specific content. For example, in a list, users should be able to refer to items as “first item”, “second”, and so on. 

**What to do:** check for the presence of &lt;cw-keys> that lists alternative phrasing usable by users to refer to an item
  
  **Examples:**
  ```HTML
  <!-- this is a header of a page offering painting workshops -->
<h1 cw-keys = "painting workshops, workshops">All our availble workshops</h1>
  
  <!-- this is the list of the different painting workshops -->
   <ul>
  <li cw-keys = "first item, first option"> oil painting workshop </li>
  <li cw-keys = "second item, second option"> chalk workshop </li>
  <li cw-keys = "third item, third option"> guache workshop </li>
</ul> 
```
</details>
  
<details open>
 <summary> <h3> 3.	Interpret visual components. The CA must translate page components that are only accessible through visual abilities by adapting and changing the way information is presented </h3> </summary>
  
When a visual component is present, such as an image, a graph, a table or a video, there should be an alternative way to programmatically present the visual component. When presenting images, it is important to distinguish between task-relevant images and decorative ones. Purely decorative images need not to be announced. Task-relevant images, like product pictures in an e-commerce, instead must have an alternative presentation usually in the form of alternative text.

  
**What to do**
- **Images:** Alternative text is the accessible name of images when they are part of interactive elements. Check for the presence of alt Text or check if an image that would present redundant information is hidden. In case the image is composed of many elements (multiple images or SVGs) consider applying the role = "img" to a container. 

  - **&lt;img> element** When using an actual image 
      ```HTML
      <!-- For images, leaving the alt tag empty signals that the image can be ignored -->

      <img alt="" source="image.jpg" >

      <!-- the alt text is necessary when the image is fundamental to understand the subject, like in the case of product images that convey information about the product -->
      <div>
        <img src="beautiful_bag.jpg" alt="Messenger bag made of apple skin leather in the colour burgundy">
        <span> Beautiful and expensive bag </span>
      </div>

      <!-- When an image is the only child of a button, the button will get its name from the image's alternative text.-->
      <button>
        <img alt="edit" source="edit-pictogram.png">
      </button>
        
      <!-- If there are other text elements as children of the button, they can be used as the accessible name. So the alt text can be omitted-->
      <button>
       <img alt="" source="edit-pictogram.png">
       <span> edit </span>
      </button>
      ```

  - **&lt;svg>** When using vector graphics
  
      ```HTML
      <!-- Setting role="img" on the outer <svg> element and giving it a label will make screen readers consider the svg as a single entity and describe it using the label -->

      <svg role="img" aria-label="Description of your SVG image">  <!-- contents of the SVG image --> </svg>
      ```

  - **&lt;span>, &lt;p> and other** When using icon fonts, or text based graphics like ASCII art
    ```html

    <!-- Another example where this might be suitable is when using ASCII emoji combinations -->
    <div role="img" aria-label="it is what it is">
      <p>
                ¯\_(ツ)_/¯
      </p>
    </div>

    <!-- The aria-hidden attribute can be used to hide redundant visuals that are not img tags, like font icons, when there is also the text equivalent -->
    <button>
      <span class="fa fa-tweet" aria-hidden="true"></span>
      <span class="label"> Tweet </span>
    </button>

    <!-- However if there is no text alternative, when using icon font, one can use aria-label to give an accessible name to the button -->
     <button aria-label=tweet>
     <span class="fa fa-tweet" aria-hidden="true"></span>
    </button>
    ```


-	**Videos:** check for audio descriptions if the video has no audio. Check also for the presence of audio controls
    ```HTML
    <!--the "controls" attribute enables default browser videoplayer controls on the video -->
    <video controls>
      <source src="/shared-assets/videos/flower.webm" type="video/webm" />
    </video>

    <!--a description can be included a separate file-->
    <audio controls>
    		<source src="/shared-assets/audio/flower-audiodescription.mp3" type="audio/mpeg" /> 
    </audio>
  
    ```
-	**Tables:** check for the use of correct semantic tags (listed below). Check for the presence of an accessible name defined using &lt;caption>, &lt;aria-label>, or &lt;aria-labelledby> tags. Check for accessible descriptions provided in other parts of the text, that provide information that can help users find, navigate, and understand tables. Additional descriptions can be provided using the &lt;aria-labelled-by> attribute
-by
    A short list of semantic tags that can be used for tables:

  - &lt;table>: to encase the whole content of the table. It includes all table semantic tags.
  - &lt;tbody>: to encapsulate cells pertaining the body
  - &lt;tr> to indicate rows, 
  - &lt;th> to indicate headers's cells,
  - &lt;thead> to encapsulate headers,
  - &lt;td> for data cells. The &lt;td> may only be used within a &lt;tr> element

    ```HTML
    <!--aria-describedby can be used to create an accessible description linking content in a separate body of text to provide additional information and description of the contents-->
    <table aria-describedby="inventory-description">

     <!--the caption provides the accessible name of the table and should alwasy be the first children of the table element-->
     <caption> Florist inventory <caption>

       <thead> 
           <!-- The scope attribute tells the browser and screen reader that everything within a column that is associated to the header with scope="col" in that column, and that a cell with scope="row" is a header for all cells in that row.-->
         <tr>
           <th scope="col">Trees</th>
           <th scope="col">Indor plants</th>
           <th scope="col">Cut flowers</th>
         </tr>
       </thead>
       <tbody>
         <tr>
           <td>Apple tree</td>
           <td>Ficus Benjamin</td>
           <td>Roses</td>
         </tr>
       </tbody>
    </table>
      
      <p id="inventory-description"> 
        The table presents three categories of plants available in the florist inventory: trees, indor plants, and cut flowers. 
      </p>
    ```
    ```HTML
    <!-- You can also use aria labelledby to use another text element as the accessible name of a table-->
    <h1 id="table-name"> Florist inventory </h1>
    <table aria-labelledby="table-name">
      <thead>
        ...
      </thead>

      <tbody>
        ...
      </tbody>
    </table>    
    ```

</details>
  
###  4.	Only present information relevant to the user based on the current context and task 
Users should not be overloaded with information. To avoid cognitive overload, information should be provided only when contextually relevant. To achieve this, information should be organized and divided into logical units.

**What to do**

- **Code perspective:** 
  - **check for proper sectioning:** The page is divided using semantic tags, such as sections, article, aside, nav that divide content in a logical structure. Each section seems to encapsulate only the content necessary to understand the aim/task of said section. 
  - **Check that proper landmarks are used for important information**: Landmarks are implicit in semantic tags, but can otherwise be specified using the &lt;role> attribute. This way the implict role is overridden. They denote important areas in a page and allow users to jump from one to the other. Try to not go over 5 or 6 landmakrs per page.
  - **check for the presence of &lt;cw-type> attribute**: This ConWeb-specific tag specifies the function of content that is encapsulated in that code block. There are three types: content, link, navigation. 
  
- **Content perspective:** 
  -  Divide content in sections that are logically independent. Avoid talking about different subjects in the same section

  - Check that descriptions are not too long. A description should not be longer than a couple of sentences. If played by audio it should take less than a minute

  - Place the most important information at the top of your section. All the content placed at the bottom of a hierarchy is more difficult to reach

**Examples**

- **Sectioning using semantic tags**

  - ***Navigation:*** use nav for navigation menues. If there are multiple menus add an aria-label to distinguish them, avoid repeating the word "navigation" to avoid repetition, since the tag is aldreay announced by assistive technology
    ```HTML 
    <!--aria-label to identify the primary navigation of the website and the secondary one-->
    <nav aria-label="primary">
    some navigation items 
    </nav>

    <nav aria-label="Secondary">
    some navigation items 
    </nav>
    ```
  - ***Section:*** the section element represents a generic grouping of content with an overarching theme. It should be used to partition content in a meaningful way. &lt;section> does not have an accessible name by itself and should be exposed only if strictly necessary. If you want the section to have an accessibile name, it needs to be labelled. 
    ```HTML 
    <!--to identify a section is usually enough to use the tiles nested inside-->
    <section>
      <h1> The first section </h1>
    </section>

    <!---associate a label using aria-label or aria-labelledby to promote a section to a landmark and give expose them in the outline of the document-->

    <section aria-labelledby="h2">
      <h2 id="h2">
        About
      </h2>
      information about the shop, the owner and services provided to end-consumers

      <section aria-label="Venues and corporations">
        information for corporations and big venues.
      </section>

    </section>
    ```
  - ***Article:*** is a self-contained section of content in a page or site. Logically it is independent from the rest of the content present in the page, like a review or a blog post.
    ```HTML 
    <main>
      <!--the title in the <h> tag is enough to identify the article because it will be announced by assistive technology-->
      <article>
        <h2> My scating review </h2>
      </article>
    </main>
    ```
  - ***Aside:*** denotes additional content that is complementary to the main topic. If there are multiple aside, each should have an accessible name defined by aria-label or aria-labelledby
    ```HTML 
    <main>
      <h1>Florist shop</h1>
      <p>a description of the shop </p>
    <!--first aside-->
    <aside aria-label="Opening times">
    Opening times
    </aside>
    <!--second aside-->
    <aside aria-label="Location">
    How to get to the shop 
    </aside>
    </main>
    ```
- **Unique landmarks**: Main, footer and header have unique landmark roles: &lt;header> = banner, &lt;main> = main, &lt;footer> = contentinfo. These roles must appear only once per document. The &lt;main> tag must used only once per page. &lt;footer> and &lt;header> must appear only once as descendant of &lt;body>, however can appear scoped in other tags, such as &lt;section>. Their role will change to "generic" and will not be announced by assistive technologies.

  - **Main:** There must be only one main and it must be a direct child of the body element
    ```HTML
    <head>... </head>
    <body>
         <!--Use only one <main> to group all the core content of your page-->
      <main>
        usually the place for most of your content
      </main>
    </body>
    ```
  - **Footer:** it identifies additional closing content not necessarily tied to the rest of the main, like author information, contacts, appendices. One can have a global footer descendant of the body or at the end of a section represented by the &lt;section>, &lt;article> or &lt;aside> tag.
    ```HTML
    <head>... </head>
    <body>   
      <main>
        <section>
          Flower shop information
          <!--local footer-->
          <footer>
            small print about terms of service
          </footer>
        <section>
      </main>
      <!--global footer child of <body> -->
      <footer>
        Shop information
        <address>
          contact information
        </address>
      </footer>
    </body>
    ```
  - **Header:** There must be only one header descendant of the body other headers can be descendant of nested sections
    ```HTML
    <head>... </head>
    <body>
      <header>
        your introduction
      </header>
      <main>
        usually the place for most of your content
        <article>
          <header>
            author, date, title
          <header>
          ...
        </article>
      </main>
    </body>
    ```
- **Using explicit landmaks**: landmarks can be specified using the attribute role, to change the behaviour of an element and change the way it should be identified by assistive technologies. It's a practice to use sparingly. When declaring multiple identical roles, use aria-label to give an unique accessible name to the element.
  ```HTML
  <!-- a common example is the role search added to a form to mark a search bar-->
      <form id="search" role="search">
        <label for="search-input">Search this site</label>
        <input type="search" id="search-input" name="search" spellcheck="false" />
        <input value="Submit" type="submit" />
      </form>

  <!--when declaring multiple identical roles, use aria-labels to distinguish the elements-->
  <form id="site-search" role="search" aria-label="Sitewide">
    <!-- search input -->
  </form>
    …

  <form id="page-search" role="search" aria-label="On this page">
    <!-- search input -->
  </form>


  ```

- **Using ConWeb &lt;cw-type> tag:** Adding the <cw-type> tag improves how elements will be interpreted in the data structure accessed by ConWeb. It is usefull when there is no semantic alternative to identify an element. there are three types: link, content-reading, navigation.

  - navigation: html elements that in the DOM have the hierarchical role of containers and have children in them. It is a 
  ```HTML

    <section cw-type="navigation"> <!--this section is a container of multiple paragraphs, therefore it is a navigation node in ConWeb datastructure-->
      <h1>Fruits available</h1>
      <div>
        <h2>Apples </h2>
          <p>
            some about apples
          </p>
      </div>

      <div>
        <h2>Oranges </h2>
          <p>
            some about oranges
          </p>
      </div>
    </section>
  ```
  - link: html elements that provide a form of in-page or in-site navigation. Can be used to identify, links, but also anchors, tabs and other navigation elements
  ```HTML
  <a href="#" cw-type="link">go to the last page</a>
  ```
  - content-reading: used to mark leaf nodes in the DOM hierarchy. To be used to mark paragraphs and other content that can be read or described to the user

  ```HTML
      <div>
        <h2>Apples </h2>
          <p cw-type="content-reading">
            some about apples
          </p>
      </div>
  ```



  
### 5. Provide summaries for long textual information before delivering it in full
Related to point 4. Users should not be overloaded with information. To avoid cognitive overload, Long textual information should be first summarised to avoid delivering unnecessary information to users. This way users can gauge whether the content is relevant for them or not. In ConWeb the &lt;cw-description> tag adds a layer of context, providing a short programmatically deremined summary of any section that can be announced to the user before delivering the whole text. 

**What to do**
-check for &lt;cw-description> that contains appropriate and meaningful summaries. A summary is meaningful if it summarize the most relevant points made in the text.

  **Examples:**
  ```HTML
  <!-- this is a header of a page offering painting workshops -->
<h1>Oil painting workshops</h1>
  
   <!-- In this paragraph users would find an extended description explaining the topics covered in the workshop. THe <cw-description> summarises this-->
  <p cw-description = "course description listing all the topics that will be covered in class" > I am a long description full of details about the different lessons in this painting workshop </p>

```
### 6.	Inform the user what is possible to do on the page: whether they have to take action or what are the next steps in the interaciton
Related to the guideline "Only present information relevant to the user based on the current context and task". Users should be aware of the possible actions on the page, links and correlated content should ba available to users to enable easier exploration of the syte. If the user is the one that needs to take action to move forward in the interaction, the system should make them aware of what is needed to do

**What to do**
 - **Semanting tags**: using semantig tags conveys the role of the HTML element. enabling ConWeb and screen readers to communicate the kind of possible actions on the page
 - **check for the presence of &lt;cw-type> attribute**: This ConWeb specific tag specifies the function of content that is encapsulated in that code block. There are three types: content, link, navigation. The link value gives ConWeb awareness of how many links are present in a specific section, making it easier to convey the additional content reachable from said section

### 7. Present content hierarchically. Use a concept based organization to  divide information into manageble chunks
Related to point 4. Users should be able to clearly understand the scope of the page and the way content is organized. Information should be clearly organized 

**What to do**

- **Code perspective:** see point 4

- **content perspective:** The content on a single page should be structured in sections, with unique themes. Do not mix different topics in a single section. Use titles to clearly identify the content of the paragraphs. 

### 8. Ensure link predictability by providing a preview of the content reachable through intra-website links

Links should be worded in a way that suggests what content will be reached. Avoid generic wording such as “learn more,” “go to page,” “more…” that have no immediate programmatic context to their purpose. Icon links should have a worded description. A meaningful label attribute or the Aria tag aria-labeledby can be added to provide additional context and describe the page that will be reached through that link.

**What to do**
- **Non-empty href attribute**: links must have a non-empty HREF attribute to be considered true links.
- **Naming Icon Links**: The aria-label property enables authors to name an element with a string that is not visually rendered

```HTML
<a href="https://somelink.com" aria-label="Open this link in a new page"> 
    <svg class="some icon" aria-hidden="true"><path ...></path></svg>
</a>

<!-- this can be achieved also with alt attributes when using images as links. Consider this color picker:-->
 <h1>Pick your color</h1>
<ul>
 <li><a href="green.html"><img src="green.jpeg" alt="Green"></a></li>
 <li><a href="blue.html"><img src="blue.jpeg" alt="Blue"></a></li>
 <li><a href="red.html"><img src="red.jpeg" alt="Red"></a></li>
</ul>
```

- **aria-labelledby**: in links, sometimes there is not enough space for all the needed information. One can concatenate information present within the link with information present in precedent text components

```HTML
<!-- Some link leading to a specific clothing article, the p elements provides additional text that previews the kind of content that will be reached thorugh the link -->
 <p id="additional-info"> View the product page of Awesome T-shirt </p>
<a href="https://somelink.com" id ="thirt" aria-labelledby="additional-info tshirt"> Open item </a>
```

- **aria-describedby**: used by screen readers to announce an element using content present in another one. This is useful when there is textual information linked to a specific action element that we want the user to know

```HTML
<!-- Using aria-describedby property to describe a Close button's action -->
<button aria-label="Close" aria-describedby="descriptionClose"
    onclick="myDialog.close()">X</button>

<!-- This is a descrtption that is referenced by the aria-describedby. The referencing is achieved through ids -->
<div id="descriptionClose">Closing this window will discard any information entered and
return you back to the main page</div>

<!-- Using aria-describedby to associate instructions with form fields -->

 <form>
<label for="fname">First name</label>
<input name="" type="text" id="fname" aria-describedby="int2">
<p id="int2">A bit of instructions for this field linked with aria-describedby. </p>
</form>

```
### 9.	Elements that have the same function are identified and worded consistently.
Buttons, menus, titles, and other elements that have the same function accross the website should be worded the same way to avoid confusion among users on the purpose of different elements.

**What to do:** check that the wording is coherent accross different part of the website. E.g.: Multiple submit button should always be called "submit" in all instances.

### 10.	Error messages are in plain language and suggest how to overcome the error
Error messages should be worded using a language that non-technical users can understand. If the error can be addressed by users themselves, the message should contain also the hint to solve the problem. Common cases are invalid inputs, where users are expected to input a specific type (numerals, symbols etc...).


**What to do** 

- **content level**
    - Check that the wording is appropriate for non-technical users. 
    - Check that a hint is present if the error is something that the user can fix themsevles.

- **code level:** check for the use of aria-invalid and aria-errormessage for proper error design. Authors MUST use aria-invalid in conjunction with aria-errormessage. 

**Examples**

```HTML
<!--When an object is invalid, we use JavaScript to add aria-invalid="true" -->
<p>
  <label for="email">Email address:</label>
  <input
    type="email"
    name="email"
    id="email"
    aria-invalid="true"
    aria-errormessage="err1" />

    <!--the error message is linked through id to the input -->
  <span id="err1" class="errormessage">Error: Enter a valid email address</span>
</p>


```
    


### 11.	If a format of input is expected, provide an example of the type of answer the chatbot expects
Providing examples of expected input is important to avoid errors when entering information. Since voice is a sequential and slow channel, it is better to avoid allowing users to make mistakes. 

**What to do:** Use appropriate and evocative examples of the data you expect the user to input. Use the appropriate semantig tags to format the imput. If it's a particulary rare input, you may want to add a description for it.

**Examples**


```HTML
 <!-- Email Input with Example Format -->
    <form>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" placeholder="name@example.com" aria-describedby= "expected_input" required>
        <small id="expected_input">Format: name@example.com</small>
    </form>

```

### 12.	Give feedback when there are pages updates
In this case we do not consider navigating accross pages, but updates whithin a dynamic web page.
On dynamic web pages where content can change over time it is important to provide updates to the users. Examples of dynamic content include chats, progress bars, notifications, errors ecc...
Live regions are a good accessibility tool for communicating a simple string of content. E.g., “your information has been saved!” or “there was a problem with X. Please try again.” Live regions only communicate strings of text.


**What to do:**

- **content level:** use clear, informative language when designing the notifications. The messages should be brief, but provide all the necessary information that the user needs to understand the change. 

- **code level:**
content that can be updated dynamically and you want to monitor for changes should be contained in a region (section, aside ecc...) and tagget with aria-live tags. Alternatively, there exist also specialized region roles that have already built-in live-behaviours. These roles include "alert", "status," "marquee", "timer".

**Examples**

```HTML
  <!--output and progress are two example of native HTML live regions. They have already a live role "status"-->

  <!--progress should be used for progress bars. It should always have a label so that users know what is being loaded. The max and min value give information about the beginning and the end of the process-->
  <label for="progress-bar">Uploading documents</label>
  <progress id="progress-bar" max="100" value="0"></progress>

  <!--example of aria live-->
  <form>
  <!-- Other form elements -->
  <button
    type="submit"
    aria-describedby="success"
  >
    Send
  </button>
  <span id="success" aria-live="polite">
    You have submitted successfully your application.
  </span>
</form>
```
