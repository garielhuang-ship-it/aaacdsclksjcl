import { getDb } from "../api/queries/connection";
import { readingPassages, speakingTopics } from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // 清空现有数据
  await db.delete(readingPassages);
  await db.delete(speakingTopics);

  // 插入朗读文章 - 科普说明文
  await db.insert(readingPassages).values([
    {
      title: "Why Leaves Change Color",
      category: "科普说明文",
      content: `Every autumn, trees in many parts of the world put on a colorful display. Green leaves turn yellow, orange, red, and sometimes purple before they fall to the ground. The process begins with a substance called chlorophyll. Chlorophyll gives leaves their green color and helps plants use sunlight to make food. During spring and summer, trees produce large amounts of chlorophyll, so the green color hides many other colors that are already present in the leaves. As autumn arrives, the days become shorter and temperatures become cooler. Many trees respond by producing less chlorophyll. When the green color disappears, yellow and orange pigments become easier to see. Some trees can also produce red pigments during this period. Eventually, the tree stops sending nutrients to the leaves, and the leaves fall. The beautiful colors of autumn are therefore part of a natural process that helps trees prepare for winter.`,
      trainingFocus: "科学词汇、被动结构、因果关系",
      wordCount: 158,
    },
    {
      title: "The Hidden World of Soil",
      category: "科普说明文",
      content: `When we look at the ground beneath our feet, soil may seem like nothing more than dirt. In reality, healthy soil is a complex living system. It contains minerals, water, air, organic matter, and countless living organisms. Tiny organisms such as bacteria and fungi help break down dead plants and animals, returning nutrients to the soil. These nutrients can then be used by growing plants. Soil also plays an important role in agriculture because crops need healthy soil to grow. In addition, soil can store water and help reduce flooding by allowing rain to move underground. However, soil can take a very long time to form. In some places, creating just a few centimeters of healthy topsoil may take hundreds or even thousands of years. This means that soil is a resource that should be carefully protected. Preventing erosion, planting vegetation, and using land responsibly can help keep soil healthy for future generations.`,
      trainingFocus: "长难句、数量表达、科学词汇",
      wordCount: 163,
    },
    {
      title: "How Bees Communicate",
      category: "科普说明文",
      content: `Honeybees live in large colonies, and finding food requires cooperation. But how can a bee tell other bees where to find flowers? Scientists have discovered that honeybees use a special movement called the waggle dance. When a worker bee finds a good source of food, it returns to the hive and performs a series of movements. The direction of the dance gives information about the direction of the food in relation to the Sun. The length of part of the dance can also provide information about the distance. Other bees watch the dancing bee and use this information to search for the flowers. Bees can also use smells to help identify the food source. The waggle dance is a remarkable example of communication in the animal world. A single bee may not be able to explain its discovery with words, but its movements can provide useful information to many other members of the colony.`,
      trainingFocus: "疑问句、术语、长句断句",
      wordCount: 149,
    },
    {
      title: "Getting Enough Sleep",
      category: "科普说明文",
      content: `Sleep is an important part of a healthy life, especially for teenagers. During the teenage years, the body and brain are still developing, so getting enough sleep can support both physical and mental health. Experts recommend that teenagers between the ages of 13 and 18 get about eight to ten hours of sleep each night. However, many teenagers find it difficult to get enough sleep. They may stay up late to study, use their smartphones, watch videos, or talk with friends. Not getting enough sleep can make it harder to pay attention and learn new information. It may also affect a person's mood and ability to make decisions. Developing good sleeping habits can help. For example, teenagers can try to go to bed and wake up at similar times every day. They can also avoid using electronic devices shortly before bedtime. Getting enough sleep may not always be easy, but it can make a real difference to how we learn, work, and feel during the day.`,
      trainingFocus: "语音准确度、关键词重音与意群停顿；梳理句子逻辑和信息层次，注意长句断句及语调变化",
      wordCount: 172,
    },
    {
      title: "Coral Reefs",
      category: "科普说明文",
      content: `Coral reefs may look like colorful rocks under the sea, but they are actually living ecosystems that support a huge variety of marine life. Although coral reefs cover less than one percent of the ocean, they provide homes for about a quarter of marine species. Fish, crabs, sea turtles, and many other animals depend on reefs for food and shelter. Coral reefs are also important to people. They support fishing and tourism, providing jobs and income for many coastal communities. In addition, healthy reefs can act as natural barriers that reduce the energy of waves and help protect coastlines from storms and erosion. Unfortunately, coral reefs face many threats, including pollution, overfishing, and rising ocean temperatures. When water becomes unusually warm, corals can lose the tiny organisms that help provide them with energy and color. This process is known as coral bleaching. Scientists around the world are studying coral reefs and looking for ways to protect these valuable ecosystems for future generations.`,
      trainingFocus: "比例与数量表达、科学术语及因果关系；练习 although、Unfortunately 等逻辑提示词",
      wordCount: 170,
    },
    {
      title: "Bridges in Human History",
      category: "科普说明文",
      content: `Bridges have played an important role in human history. They allow people to cross rivers, valleys, and other difficult areas more easily. Some of the earliest bridges were very simple. People used wood, stones, or ropes to create paths across water. As technology developed, engineers learned how to build longer and stronger bridges. One famous example is the Golden Gate Bridge in San Francisco. When it opened in 1937, it was the longest suspension bridge in the world. Today, modern bridges can be even more impressive. Some are designed to carry thousands of cars every day, while others are built for trains, bicycles, and pedestrians. Building a bridge requires careful planning because engineers must consider its weight, materials, weather conditions, and safety. A bridge is more than a way to cross a river. It can also connect communities and make travel and communication easier.`,
      trainingFocus: "历史时间与被动语态；注意长句断句、列举结构和说明文的平稳节奏",
      wordCount: 155,
    },
  ]);

  // 插入朗读文章 - 发明与科技史
  await db.insert(readingPassages).values([
    {
      title: "How the Microwave Oven Was Invented",
      category: "发明与科技史",
      content: `The microwave oven is now common in kitchens around the world, but its invention was the result of an unexpected discovery. In 1945, American engineer Percy Spencer was working with a device called a magnetron, which was used in radar equipment. One day, Spencer noticed that a chocolate bar in his pocket had melted while he was working near the machine. He wondered whether the energy from the magnetron had caused the chocolate to melt. To test his idea, he placed some popcorn kernels near the equipment. Soon, the kernels began to pop. Spencer then tried the experiment with an egg, which became hot and exploded. These experiments showed that microwave energy could heat food quickly. The first microwave ovens were much larger and more expensive than the machines we use today. Over time, the technology improved, and microwave ovens became smaller, cheaper, and more convenient.`,
      trainingFocus: "1945、人物名、设备名、事件顺序",
      wordCount: 154,
    },
    {
      title: "How Traffic Lights Changed Cities",
      category: "发明与科技史",
      content: `Today, traffic lights are an ordinary part of city life. They help cars, bicycles, and pedestrians move safely through busy streets. However, the first traffic signals were very different from the ones we see today. In the nineteenth century, London had become crowded with horses, carriages, and pedestrians. To control traffic near an important intersection, a railway engineer named John Peake Knight designed a signal based on the system used by railways. The signal was installed in London in 1868 and used red and green lights. Unfortunately, it did not last long because a gas explosion injured the police officer operating it. Decades later, as automobiles became more common, cities needed better ways to control traffic. Electric traffic signals were gradually introduced, and the familiar red, yellow, and green system developed.`,
      trainingFocus: "1868、地名、人名、被动语态",
      wordCount: 145,
    },
    {
      title: "The First Photograph",
      category: "发明与科技史",
      content: `Before cameras became part of everyday life, people had no simple way to capture a real scene and keep it as an image. In the early nineteenth century, inventors began searching for a solution. One of them was Joseph Nicéphore Niépce, a French inventor who experimented with light-sensitive materials. Around 1826, he created what is generally considered the world's earliest surviving photograph. The image showed the view from a window at Niépce's home in France. Creating the photograph was not easy. The process required a specially prepared plate and many hours of exposure to sunlight. The result was very different from the photographs we take today with our phones. Nevertheless, Niépce's work was an important step in the development of photography. Other inventors later improved the process, making photographs clearer and much faster to produce.`,
      trainingFocus: "1826、人名、专有名词、长句",
      wordCount: 145,
    },
    {
      title: "How the Internet Began",
      category: "发明与科技史",
      content: `Today, people use the Internet to communicate, study, shop, work, and entertain themselves. However, the Internet was not created all at once. Its development began with several different technologies and research projects. In the 1960s, researchers in the United States worked on ways for computers to communicate across networks. One important project was called ARPANET. In 1969, computers at four American research institutions were connected through this network. The system was very different from the Internet we use today, but it demonstrated that computers in different locations could exchange information. In the following decades, researchers developed new technologies and communication standards. One of the most important developments was the creation of the World Wide Web by British computer scientist Tim Berners-Lee in 1989. The Web made it much easier for people to access and share information online.`,
      trainingFocus: "1960s、1969、ARPANET、1989、专有名词",
      wordCount: 145,
    },
  ]);

  // 插入朗读文章 - 记叙文
  await db.insert(readingPassages).values([
    {
      title: "A Lifelong Love of Birds",
      category: "记叙文",
      content: `When he was a young boy, John James Audubon loved watching birds. He spent hours walking through the forests near his home and carefully observing the birds around him. At that time, few people studied birds in the way he did. Audubon wanted to know where birds traveled, what they ate, and how they behaved. He began drawing pictures of the birds he saw. However, he soon discovered that drawing a bird from memory was not enough. He wanted his paintings to show the birds as they really looked in nature. To do this, he sometimes collected birds and studied their bodies carefully before drawing them. Years later, Audubon traveled across North America to study and paint hundreds of species. His work eventually became a famous collection called The Birds of America. Audubon faced many difficulties during his travels, but he continued his work because of his deep love for birds. His story shows how curiosity can become a lifelong passion.`,
      trainingFocus: "人物叙述与过去时；注意 where / what / how 引导的并列信息、长句意群停顿，以及由好奇到热爱的情感递进",
      wordCount: 163,
    },
    {
      title: "The First Day at a New School",
      category: "记叙文",
      content: `On her first day at a new school, Emma felt nervous. She did not know anyone, and she was worried that the other students would not talk to her. When she entered the classroom, most of the students were already sitting with their friends. Emma quietly chose a seat near the window and took out her books. A few minutes later, the teacher asked everyone to introduce themselves to a new classmate. The student sitting next to Emma smiled and introduced herself as Lily. They discovered that they both enjoyed reading and playing badminton. During lunch, Lily invited Emma to sit with her and her friends. By the end of the day, Emma was much more relaxed. She realized that making new friends did not always require a big conversation or a special plan. Sometimes, a simple smile and a friendly question could be enough to begin a new friendship. Years later, Emma still remembered that first day and the small act of kindness that made her feel welcome.`,
      trainingFocus: "情绪变化与人物对话感；练习 nervous、relaxed 等情绪词的语气处理，并关注时间顺序和长句断句",
      wordCount: 163,
    },
    {
      title: "A Small Act of Kindness",
      category: "记叙文",
      content: `One rainy morning, a young man named James was waiting for a bus when he saw an old woman standing nearby without an umbrella. She was carrying several bags and looked worried. James offered to carry the bags while she waited. When the bus arrived, he helped her get on and then returned to his own stop. The whole thing took only a few minutes, and James quickly forgot about it. Several years later, James was looking for a job. He went to an interview at a large company and waited in the reception area. When the manager walked into the room, James recognized her immediately. She was the woman he had helped on that rainy morning. She recognized him too. During the interview, she told him that she had never forgotten the young man who had helped her when she was struggling with heavy bags. James eventually received the job. He later realized that a small act of kindness might not bring an immediate reward, but it could remain meaningful long after the moment had passed.`,
      trainingFocus: "故事叙述与情感转折；注意动作顺序、过去时和人物语气，结尾体现温和、自然的感悟语调",
      wordCount: 174,
    },
    {
      title: "The Power of a Small Idea",
      category: "记叙文",
      content: `When Maya was twelve years old, she noticed that many children in her neighborhood had no books at home. The nearest public library was several kilometers away, and some families could not easily travel there. Maya wanted to help, so she came up with a simple idea. She asked her classmates to donate books they no longer needed. At first, only a few students responded. Maya did not give up. She made posters, talked to local businesses, and asked her neighbors for help. Within a few months, she had collected hundreds of books. An empty room in a community center was offered to her, and volunteers helped turn it into a small library. Children could visit after school, read books, and borrow them for free. Maya was surprised by how quickly a small idea could grow when other people joined her. She later said that she had learned an important lesson: you do not have to be an adult to make a difference in your community.`,
      trainingFocus: "过去时、长句、情绪转折、community 等多音节词",
      wordCount: 159,
    },
    {
      title: "The Race That Wasn't About Winning",
      category: "记叙文",
      content: `Michael had trained for months for his school's running competition. He wanted to win the 1,500-meter race, and he believed he was ready. On the day of the competition, he started strongly and quickly moved to the front. However, halfway through the race, another runner suddenly fell to the ground. Michael stopped and looked back. For a moment, he thought about continuing because he was so close to winning. Then he turned around and went back to help the other runner. He helped him stand up and stayed with him until a teacher arrived. By then, the other runners had already crossed the finish line. Michael finished the race last. He was disappointed, but his classmates began cheering for him as he crossed the line. His coach later told him that competitions were not only about finishing first. Michael did not win the race that day, but he learned something more important: sometimes, helping another person matters more than achieving a personal goal.`,
      trainingFocus: "数字、过去完成时、转折连接词、情感语气",
      wordCount: 161,
    },
    {
      title: "The Old Bicycle",
      category: "记叙文",
      content: `When Tom was a child, his grandfather gave him an old bicycle. It was not new or expensive. The paint was scratched, one of the tires was slightly damaged, and the seat was too high for Tom. At first, he was disappointed because his friends had modern bicycles. His grandfather simply smiled and told him that the bicycle had once belonged to him. Tom decided to learn how to ride it. Over the next few weeks, his grandfather helped him repair the bicycle. Together, they cleaned the frame, replaced the tires, and adjusted the seat. Soon, Tom was riding around the neighborhood every afternoon. Years later, when Tom went to university, he left the bicycle at his parents' house. He eventually bought a new one, but he never forgot the old bicycle. After his grandfather passed away, Tom brought it to his own home and repaired it again. The bicycle was still not valuable in terms of money, but to Tom, it had become a reminder of his grandfather.`,
      trainingFocus: "描述性句子、并列结构、过去时、自然停顿",
      wordCount: 158,
    },
    {
      title: "The Unexpected Audience",
      category: "记叙文",
      content: `Sarah had always been afraid of speaking in front of other people. One morning, her teacher asked her to give a short speech in front of the class. Sarah prepared carefully the night before, but when she stood in front of her classmates, she suddenly forgot her first sentence. She looked at the audience and felt her face becoming hot. For a few seconds, the classroom was completely silent. Then she noticed her best friend smiling at her from the front row. Sarah took a deep breath and started again. This time, she spoke slowly and focused on the ideas instead of worrying about making mistakes. When she finished, her classmates applauded. Sarah was surprised. She had always thought that confident speakers never felt nervous. Later, her teacher told her that being confident did not mean having no fear. It meant continuing even when you were afraid. Sarah remembered those words for a long time.`,
      trainingFocus: "情绪变化、直接引语感、停顿与语调",
      wordCount: 152,
    },
    {
      title: "A Storm on the Mountain",
      category: "记叙文",
      content: `Last summer, a group of students went hiking in the mountains with their teacher. The weather was sunny when they started, and everyone was excited about reaching the top. After several hours, however, dark clouds suddenly appeared. The wind became stronger, and heavy rain began to fall. The teacher immediately told the students to stop climbing. Instead of continuing toward the top, they moved to a safe area and waited for the storm to pass. One student was disappointed because he had been hoping to take a photograph from the top of the mountain. The teacher explained that reaching the top was not the most important part of the trip. Everyone's safety came first. After about an hour, the rain became lighter, and the group slowly returned to the starting point. Although they never reached the top, the students learned an important lesson that day. In nature, being prepared and knowing when to turn back can be more important than achieving a goal.`,
      trainingFocus: "天气词汇、过去进行时、although/ instead of 等结构",
      wordCount: 157,
    },
    {
      title: "The Letter That Arrived Too Late",
      category: "记叙文",
      content: `For many years, Mr. Brown kept an old letter in a wooden box. The letter had been written by his childhood friend, David, more than fifty years earlier. When they were young, the two boys had promised to stay in touch after leaving their hometown. However, life became busy, and they slowly lost contact. One day, Mr. Brown discovered the old letter while cleaning his house. He read it again and realized that David had written about his dream of becoming a teacher. Curious about what had happened to his old friend, Mr. Brown searched for his name online. After several days, he finally found an article about David, who had spent more than forty years teaching children in a small town. Mr. Brown contacted him, and the two friends soon began talking again. They discovered that they still remembered many of the same childhood stories. The letter had arrived decades too late, but it had helped bring two old friends together again.`,
      trainingFocus: "时间表达、过去完成时、长定语从句",
      wordCount: 159,
    },
  ]);

  // 插入朗读文章 - 人物传记与人物故事
  await db.insert(readingPassages).values([
    {
      title: "The First Flight",
      category: "人物传记与人物故事",
      content: `For thousands of years, humans dreamed of flying like birds. In the nineteenth century, inventors and scientists began studying how machines could stay in the air. Many early attempts failed, but people continued to learn from their mistakes. Among the most famous aviation pioneers were Wilbur and Orville Wright, two brothers from the United States. They owned a bicycle shop, but they became deeply interested in flight. They built and tested several gliders and carefully recorded the results of their experiments. On December 17, 1903, the brothers made history near Kitty Hawk, North Carolina. Orville Wright made the first successful powered flight, which lasted about twelve seconds and covered approximately 120 feet. Later that day, Wilbur flew an even greater distance. Their experiments demonstrated that controlled, powered flight was possible and influenced the development of modern aircraft.`,
      trainingFocus: "日期、数字、地名、人名、过去时",
      wordCount: 148,
    },
    {
      title: "A Young Scientist's Curiosity",
      category: "人物传记与人物故事",
      content: `As a child, Daniel was always asking questions. He wanted to know why leaves changed color, how birds knew where to fly, and why some objects floated while others sank. His parents did not always know the answers, but they encouraged him to look for them himself. When Daniel was thirteen, his science teacher gave the class a simple experiment. Each student had to design a way to keep an ice cube from melting. Daniel became fascinated by the problem. He tested paper, cloth, plastic, and several other materials. His first attempts failed, but he carefully wrote down what happened each time. Finally, he discovered that combining two materials worked better than using either one alone. The experiment did not win him a major prize, but it changed the way he thought about science. Daniel realized that failure could provide useful information. Years later, when he became a scientist, he still kept the notebook from that first experiment.`,
      trainingFocus: "疑问句语调、实验词汇、并列结构",
      wordCount: 158,
    },
    {
      title: "The Story of the Bicycle",
      category: "人物传记与人物故事",
      content: `The bicycle may seem like a simple invention, but it has a long and interesting history. One important early step came in 1817, when German inventor Karl von Drais introduced a two-wheeled machine that could be steered from the front. The rider sat on a seat and pushed the machine forward with his feet. It did not have pedals, but it offered an important new way to travel. Over time, inventors continued to improve bicycles by adding pedals, better wheels, and stronger frames. By the late nineteenth century, bicycles had become popular in many countries. They were relatively affordable and gave people a new way to travel independently. Bicycle design also influenced the development of other machines. Today, bicycles are used for transportation, exercise, sport, and recreation. Although modern bicycles are very different from the early machines, the basic idea remains simple: two wheels can take people surprisingly far.`,
      trainingFocus: "年份、专有名词、被动语态、技术词汇",
      wordCount: 151,
    },
    {
      title: "The Man Who Studied Birds",
      category: "人物传记与人物故事",
      content: `John James Audubon developed a deep interest in birds when he was young. He spent hours observing them in forests and fields, recording their behavior and drawing what he saw. He wanted his paintings to show birds as accurately as possible, including the way they moved and fed. In the early nineteenth century, he traveled across North America to study different species. The journeys were difficult. He often traveled long distances, worked outdoors in changing weather, and carried the materials he needed for his drawings. Yet he continued because he believed that careful observation was essential to understanding nature. His work eventually became a famous collection known as The Birds of America. The book contained hundreds of large illustrations and helped make bird study more popular. Audubon's work also left a lasting record of many species and their habitats. His life shows how careful observation and persistence can turn a personal interest into important scientific and artistic work.`,
      trainingFocus: "人物叙述、长句、专业词汇、情感递进",
      wordCount: 152,
    },
  ]);

  // 插入朗读文章 - 文化、社会与人物特写
  await db.insert(readingPassages).values([
    {
      title: "The Story of Chocolate",
      category: "文化、社会与人物特写",
      content: `Chocolate has been enjoyed by people for hundreds of years, but the chocolate we eat today is quite different from the drink made by ancient civilizations in Central America. The story begins with the cacao tree, which produces large pods containing cacao beans. The Maya and Aztec civilizations used cacao beans to prepare a bitter drink, sometimes mixed with spices. When cacao reached Europe in the sixteenth century, people began experimenting with different ways to prepare it. Sugar was added to make the drink sweeter, and chocolate gradually became popular among wealthy Europeans. In the nineteenth century, new machines and techniques changed the chocolate industry. Manufacturers learned how to process cacao more efficiently and create smoother chocolate products. Eventually, solid chocolate bars became widely available. Today, chocolate is produced in many different forms, from dark chocolate to milk chocolate and cocoa powder.`,
      trainingFocus: "文化词汇、时间线、Maya/Aztec 等专有名词",
      wordCount: 142,
    },
    {
      title: "A Festival of Light",
      category: "文化、社会与人物特写",
      content: `Every year, communities around the world celebrate festivals that use light to create a special atmosphere. In some places, people light candles, lanterns, or small lamps and place them outside their homes. These traditions may have different origins and meanings, but they often share a common idea: light represents hope, warmth, or the beginning of something new. During a festival, families may prepare special food, visit relatives, and spend time together. Children often enjoy the colorful decorations and outdoor activities. Visitors may also be interested in the stories behind the celebration. Cultural festivals are not only opportunities for entertainment. They can help younger generations learn about traditions that have been passed down for many years. At the same time, festivals can change as societies change. New music, technology, and forms of celebration may become part of an old tradition. In this way, culture can remain connected to the past while continuing to develop in the present.`,
      trainingFocus: "抽象词汇、并列结构、观点表达",
      wordCount: 155,
    },
    {
      title: "A Bridge Between Two Communities",
      category: "文化、社会与人物特写",
      content: `For years, two villages on opposite sides of a river were connected by a narrow and unreliable path. During the rainy season, the river became too dangerous to cross, and students sometimes had difficulty getting to school. Local residents repeatedly discussed the problem, but building a bridge seemed too expensive. Eventually, a group of young volunteers began collecting ideas and raising money. They contacted local businesses, organized community events, and asked engineers for advice. After months of preparation, enough support was gathered to begin construction. The bridge was completed the following year. It was not a huge structure, but it changed daily life for both villages. Children could travel to school more safely, farmers could transport their products more easily, and families could visit one another without making a long journey. The bridge became more than a piece of infrastructure. For many residents, it became a symbol of cooperation between communities.`,
      trainingFocus: "过去时、被动语态、长句和情绪递进",
      wordCount: 155,
    },
    {
      title: "A Day at a Traditional Market",
      category: "文化、社会与人物特写",
      content: `When I visited a traditional market for the first time, I expected to see rows of shops and busy customers. What surprised me was how much conversation took place between the sellers and the people who came to buy things. One fruit seller greeted many customers by name. An elderly woman stopped to ask about the price of vegetables, while a child carefully chose a small cake from a nearby stall. The market was noisy, crowded, and full of different smells. At first, I found it difficult to understand what was happening around me. After spending more time there, however, I began to notice a familiar rhythm. People were not simply buying food. They were exchanging news, greeting neighbors, and maintaining relationships. Before I left, the fruit seller offered me a piece of fruit to try. That small gesture made the busy market feel surprisingly welcoming. I realized that a market can be more than a place for shopping; it can also be a place where community life takes place.`,
      trainingFocus: "第一人称叙述、过去时、环境描写、语调变化",
      wordCount: 158,
    },
    {
      title: "The Young Inventor",
      category: "文化、社会与人物特写",
      content: `At the age of fourteen, Leo became interested in the amount of food wasted in his school cafeteria. Every day, he saw students throw away unopened food and meals they had barely touched. Instead of simply complaining about the problem, Leo decided to collect information. For several weeks, he recorded how much food was being thrown away and talked to students about why it happened. He discovered that many students took more food than they could eat because they were unsure how much they needed. Leo suggested a simple solution: smaller portions with the option of getting more food later. The school agreed to test the idea for one month. At the end of the experiment, the amount of wasted food had decreased. Leo's project attracted attention from a local newspaper, but he said the most important result was not the newspaper article. It was seeing students change their habits after realizing how much food they had been wasting.`,
      trainingFocus: "数字、采访语气、因果关系、长句",
      wordCount: 152,
    },
    {
      title: "The Teacher Who Stayed Late",
      category: "文化、社会与人物特写",
      content: `Every evening after school, Ms. Chen stayed in her classroom for another hour. She was not required to do this, but several students needed extra help with their English. Some were preparing for competitions, while others simply wanted to become more confident speakers. At first, only two students stayed. Gradually, more students joined them. Ms. Chen did not give long lectures. Instead, she asked students to read aloud, explain their ideas, and listen to one another. She believed that improvement came from regular practice rather than from memorizing difficult words. One student later remembered that he had been afraid of making mistakes when he first joined the group. After several months, he volunteered to give a speech at a school event. He still made a few mistakes, but he finished the speech with confidence. Ms. Chen was pleased, but she said the real achievement was that the student had stopped being afraid of trying. For her, teaching was not only about knowledge; it was also about helping students believe in themselves.`,
      trainingFocus: "人物语气、直接引语、长句、情感表达",
      wordCount: 166,
    },
  ]);

  // 插入朗读文章 - 演讲
  await db.insert(readingPassages).values([
    {
      title: "A New Way to Learn",
      category: "演讲",
      content: `Technology has changed the way students learn. In the past, most students depended mainly on textbooks and classroom lessons. Today, they can watch educational videos, use online dictionaries, join virtual classes, and communicate with learners in other countries. These tools can make learning more flexible, but technology does not automatically make learning better. Students still need to decide what information is reliable and how to use it effectively. For example, an online video may explain a difficult idea clearly, but watching a video once does not mean that the student has truly learned the subject. Good learning still requires attention, practice, and reflection. Technology should therefore be seen as a tool rather than a replacement for teachers or students' own effort. When used wisely, digital resources can give learners more choices and help them explore subjects beyond the classroom. The most important question is not whether technology is good or bad, but how we choose to use it.`,
      trainingFocus: "观点重音、逻辑连接词、长难句",
      wordCount: 152,
    },
    {
      title: "Small Actions, Big Changes",
      category: "演讲",
      content: `We often believe that meaningful change requires a big plan or a powerful person. But history shows that change can also begin with a small action. A student may encourage classmates to recycle. A neighbor may organize a community clean-up. A teacher may give one student the confidence to speak in public. None of these actions seems likely to change the world overnight. Yet small actions can influence other people, and those people can influence others. Over time, a simple idea can travel much farther than its creator expected. This does not mean that every small action will succeed. Some ideas will fail, and some efforts will take years to produce results. What matters is the willingness to begin. We do not always know where an action will lead when we take the first step. But if we wait for the perfect moment or the perfect plan, we may never start at all. Sometimes, the first step is the most important one.`,
      trainingFocus: "演讲重音、排比、反问式逻辑、节奏",
      wordCount: 151,
    },
    {
      title: "Should Students Use Smartphones at School?",
      category: "演讲",
      content: `Smartphones have become an important part of everyday life, and many students bring them to school. Some people believe that phones should be completely banned because they can distract students from learning. Others argue that smartphones can be useful educational tools. For example, students can use them to look up unfamiliar words, record ideas, or access learning materials. The real challenge may not be whether students should have smartphones, but how they should use them. Schools can establish clear rules about when phones are allowed and when they must be put away. Teachers can also show students how to use digital tools responsibly. At the same time, students need to understand that having access to information does not mean they should use their phones during every activity. A balanced approach may help students benefit from technology without allowing it to interrupt learning. In the end, responsible use is a skill that students need both inside and outside the classroom.`,
      trainingFocus: "观点对比、should/may/can、逻辑重音",
      wordCount: 151,
    },
    {
      title: "A Speech About Curiosity",
      category: "演讲",
      content: `Curiosity is one of the most useful qualities a student can have. When we are curious, we ask questions. We notice details that other people may ignore. We look for explanations when something does not make sense. Curiosity also helps us become better learners because it encourages us to go beyond the information we are given. Imagine a student who reads about space and then asks how astronauts live without ordinary gravity. That question may lead to another question, and then another. Before long, the student may discover an entire field of science that he or she had never considered before. Of course, curiosity does not always lead to easy answers. Sometimes the more we learn, the more questions we have. But that is not a problem. Questions are often the beginning of discovery. So when you do not understand something, do not be afraid to ask why. A good question may be the first step toward a much bigger idea.`,
      trainingFocus: "演讲节奏、排比、强调句、语调",
      wordCount: 148,
    },
  ]);

  // 插入口语题库 - 日常生活与个人表达
  await db.insert(speakingTopics).values([
    { category: "日常生活与个人表达", question: "What do you usually do after school? Why?", difficulty: "easy" },
    { category: "日常生活与个人表达", question: "What is your favorite way to relax after a busy day? Why?", difficulty: "easy" },
    { category: "日常生活与个人表达", question: "Do you prefer studying alone or with friends? Why?", difficulty: "easy" },
    { category: "日常生活与个人表达", question: "What is one thing you would like to improve about yourself? Why?", difficulty: "medium" },
    { category: "日常生活与个人表达", question: "What makes a good friend?", difficulty: "easy" },
    { category: "日常生活与个人表达", question: "Did you have a long journey with your family as a child?", difficulty: "medium" },
    { category: "日常生活与个人表达", question: "Do you prefer to spend time with one friend or with a group of friends?", difficulty: "easy" },
    { category: "日常生活与个人表达", question: "How important are friends to you?", difficulty: "easy" },
  ]);

  // 插入口语题库 - 学校与学习
  await db.insert(speakingTopics).values([
    { category: "学校与学习", question: "Should students be allowed to choose some of the subjects they study? Why?", difficulty: "medium" },
    { category: "学校与学习", question: "Which is more important: getting good grades or developing useful skills? Why?", difficulty: "medium" },
    { category: "学校与学习", question: "Do you think students should have less homework? Why or why not?", difficulty: "easy" },
  ]);

  // 插入口语题库 - 兴趣与个人选择
  await db.insert(speakingTopics).values([
    { category: "兴趣与个人选择", question: "What is your favorite hobby? Why do you enjoy it?", difficulty: "easy" },
    { category: "兴趣与个人选择", question: "What kind of books, movies, or music do you enjoy most? Why?", difficulty: "easy" },
    { category: "兴趣与个人选择", question: "If you could learn one new skill, what would it be and why?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 综合思辨类
  await db.insert(speakingTopics).values([
    { category: "综合思辨类", question: "If you could bring one modern technology back to ancient China, what would it be and when?", difficulty: "hard" },
    { category: "综合思辨类", question: "What do you think is the most important moral quality for a young person in today's world?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 深度思考
  await db.insert(speakingTopics).values([
    { category: "深度思考", question: "Can failure sometimes be more valuable than success? Why?", difficulty: "hard" },
    { category: "深度思考", question: "Is making mistakes an important part of learning? Why?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 比较与权衡
  await db.insert(speakingTopics).values([
    { category: "比较与权衡", question: "Which is more important for success: talent or hard work? Why?", difficulty: "medium" },
    { category: "比较与权衡", question: "Is it better to have many friends or a few close friends? Why?", difficulty: "easy" },
  ]);

  // 插入口语题库 - 问题分析与解决
  await db.insert(speakingTopics).values([
    { category: "问题分析与解决", question: "How can we encourage young people to read more books?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 社会现象与观点判断
  await db.insert(speakingTopics).values([
    { category: "社会现象与观点判断", question: "Why are some traditional activities becoming less popular among young people?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 文化与交流
  await db.insert(speakingTopics).values([
    { category: "文化与交流", question: "What Chinese tradition would you like to introduce to foreigners? Why?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 人与社会
  await db.insert(speakingTopics).values([
    { category: "人与社会", question: "Do you think young people should take part in volunteer activities? Why?", difficulty: "easy" },
  ]);

  // 插入口语题库 - 健康的生活方式
  await db.insert(speakingTopics).values([
    { category: "健康的生活方式", question: "Do you think teenagers today exercise enough? Why or why not?", difficulty: "easy" },
    { category: "健康的生活方式", question: "Why do some people find it difficult to develop healthy habits?", difficulty: "medium" },
    { category: "健康的生活方式", question: "Which is more important for a healthy life: a balanced diet or regular exercise? Why?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 科技与生活
  await db.insert(speakingTopics).values([
    { category: "科技与生活", question: "How has technology changed the way students study?", difficulty: "easy" },
    { category: "科技与生活", question: "Should students be allowed to use smartphones at school? Why or why not?", difficulty: "medium" },
    { category: "科技与生活", question: "Do you think people rely too much on technology today? Why?", difficulty: "medium" },
  ]);

  // 插入口语题库 - 时间管理与成长
  await db.insert(speakingTopics).values([
    { category: "时间管理与成长", question: "Do you think teenagers should have a fixed daily schedule? Why or why not?", difficulty: "easy" },
  ]);

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed();
