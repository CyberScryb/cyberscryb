/* Digital Footprint Check — areas, scoring, and the cleanup plan.
   Nothing here is fetched. The audit never asks for a name, email, phone, or address. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DFLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/digital-footprint/';
  var STORE_VERSION = 1;

  function link(label, href) {
    return { label: label, href: href };
  }

  function choice(id, points, label) {
    return { id: id, points: points, label: label };
  }

  function guide(title, why, how, links) {
    return { title: title, why: why, how: how, links: links };
  }

  var L = {
    results: link(
      'Google: Results about you',
      'https://support.google.com/websearch/answer/12719076'
    ),
    resultsTool: link(
      'Google: Results about you tool',
      'https://myactivity.google.com/results-about-you'
    ),
    ftcBrokers: link(
      'FTC: people-search sites',
      'https://consumer.ftc.gov/articles/what-know-about-people-search-sites-sell-your-information'
    ),
    spokeo: link('Spokeo opt-out', 'https://www.spokeo.com/optout'),
    whitepages: link('Whitepages suppression', 'https://www.whitepages.com/suppression-requests'),
    beenVerified: link('BeenVerified opt-out', 'https://www.beenverified.com/app/optout/search'),
    intelius: link('Intelius opt-out', 'https://www.intelius.com/opt-out'),
    facebookPrivacy: link('Facebook Privacy Center', 'https://www.facebook.com/privacy/center/'),
    facebookDelete: link(
      'Facebook: delete an account',
      'https://www.facebook.com/help/224562897555674'
    ),
    instagram: link('Instagram privacy', 'https://help.instagram.com/196883487377501'),
    xPosts: link(
      'X: public and protected posts',
      'https://help.x.com/en/safety-and-security/public-and-protected-posts'
    ),
    tiktok: link(
      'TikTok privacy',
      'https://support.tiktok.com/en/account-and-privacy/account-privacy-settings'
    ),
    linkedin: link(
      'LinkedIn profile visibility',
      'https://www.linkedin.com/help/linkedin/answer/a528212'
    ),
    inactive: link('Google: inactive account', 'https://myaccount.google.com/inactive'),
    security: link('Google Security Checkup', 'https://myaccount.google.com/security-checkup'),
    location: link('Google Location History', 'https://support.google.com/accounts/answer/3118687'),
    mapsShare: link(
      'Google Maps location sharing',
      'https://support.google.com/maps/answer/7326816'
    ),
    appleLocation: link('Apple Location Services', 'https://support.apple.com/en-us/102515'),
    photos: link('Google Photos: location', 'https://support.google.com/photos/answer/6153599'),
    applePhotos: link(
      'iPhone photo info',
      'https://support.apple.com/guide/iphone/view-photo-and-video-info-iph3ecf4092/ios'
    ),
    reviews: link('Google Maps contributions', 'https://support.google.com/maps/answer/6230175'),
    pwned: link('Have I Been Pwned', 'https://haveibeenpwned.com/'),
    identity: link('IdentityTheft.gov', 'https://www.identitytheft.gov/'),
    appleFactor: link('Apple two-factor authentication', 'https://support.apple.com/en-us/102660'),
    alexa: link('Alexa privacy', 'https://www.amazon.com/alexa-privacy/apd/home'),
    nest: link(
      'Google Home and Nest privacy',
      'https://support.google.com/googlehome/answer/7072285'
    ),
    assistant: link(
      'Delete Google Assistant activity',
      'https://support.google.com/assistant/answer/7108295'
    ),
    audio: link(
      'Google: voice and audio activity',
      'https://support.google.com/accounts/answer/6030020'
    ),
    android: link('Android app permissions', 'https://support.google.com/android/answer/9431959'),
    appleApps: link(
      'iPhone app access',
      'https://support.apple.com/guide/iphone/control-access-to-information-in-apps-iph251e92810/ios'
    ),
    appleTrack: link('Apple app tracking', 'https://support.apple.com/en-us/102420'),
    adCenter: link('Google My Ad Center', 'https://myadcenter.google.com/'),
    activity: link('Google My Activity', 'https://myactivity.google.com/'),
  };

  var ALLOWED_HOSTS = [
    'support.google.com',
    'support.apple.com',
    'myaccount.google.com',
    'myactivity.google.com',
    'myadcenter.google.com',
    'consumer.ftc.gov',
    'haveibeenpwned.com',
    'www.identitytheft.gov',
    'www.facebook.com',
    'help.instagram.com',
    'help.x.com',
    'support.tiktok.com',
    'www.linkedin.com',
    'www.spokeo.com',
    'www.whitepages.com',
    'www.beenverified.com',
    'www.intelius.com',
    'www.amazon.com',
  ];

  function item(id, short, prompt, detail, priority, states, fix, kept) {
    return {
      id: id,
      short: short,
      prompt: prompt,
      detail: detail,
      priority: priority,
      states: states,
      fix: fix,
      keep: kept,
    };
  }

  function handled(label) {
    return choice('handled', 0, label);
  }

  function partial(label) {
    return choice('partial', 1, label);
  }

  function open(label) {
    return choice('open', 2, label);
  }

  var AREAS = [
    {
      id: 'social',
      name: 'Social media visibility',
      short: 'Social',
      intro: 'Who can see posts, friends, and profiles you no longer watch.',
      items: [
        item(
          'social-posts',
          'Posts',
          'Who can see posts, the friends list, and the profile details?',
          'Handled means only people you approve, or the account is gone. Still open means anyone can browse them.',
          70,
          [
            handled('Only people I approve, or the account is gone.'),
            partial('Some profiles are private and some are still public.'),
            open('Posts, friends, or the profile are open to anyone.'),
          ],
          guide(
            'Tighten who can see your social profiles',
            'A public friends list and public posts are a map. People-search sites and scammers both use that map.',
            'On each profile you still use, set the audience to friends or approved followers. Hide the friends list, the phone field, and the birthday. Review tagged photos the same way.',
            [L.facebookPrivacy, L.instagram, L.xPosts, L.tiktok, L.linkedin]
          ),
          guide(
            'Keep social audiences limited to people you approve',
            'A private audience is what stops a stranger from browsing the friends list and the old posts.',
            'When you open a new profile, set the audience before the first post. Leave the phone field and the birthday off the public page.',
            [L.facebookPrivacy, L.instagram]
          )
        ),
        item(
          'social-old',
          'Old profiles',
          'What happened to social accounts you no longer post on?',
          'Handled means you closed them, or they are private and you still control the login.',
          56,
          [
            handled('I closed them, or they are private and I still control the login.'),
            partial('A few old profiles are still up and I am not sure who can see them.'),
            open('Old profiles are public, or I cannot remember the login.'),
          ],
          guide(
            'Close or lock social accounts you no longer use',
            'An abandoned public profile keeps photos and friends visible after you have moved on.',
            'Sign in from a bookmark, download anything you want to keep, then delete the account or set it private. If you cannot get in, use the account recovery page on that site, then delete it.',
            [L.facebookDelete, L.instagram, L.inactive]
          ),
          guide(
            'Keep closing a social account when you stop using it',
            'A profile you still control can be locked. One you forgot cannot.',
            'When you leave a network, delete it in the same week, or set it private and store the login in a password manager.',
            [L.facebookDelete]
          )
        ),
        item(
          'social-search',
          'Search',
          'Would a name search still list those profiles on the first page?',
          'This is about the setting, not a search we run. Handled means indexing is limited, or you have already checked.',
          48,
          [
            handled('Indexing is limited, or I have checked and removed the extras.'),
            partial('One profile would still show up, and I have not changed that setting.'),
            open('I have not looked at indexing, and the profiles are easy to find.'),
          ],
          guide(
            'Limit which profiles a search result can show',
            'A public profile is easy to pair with a people-search listing.',
            'Use the search and indexing setting on each platform. Where a result shows contact details, the Google Results about you page is the official removal request. This page does not run a search.',
            [L.results, L.resultsTool, L.linkedin]
          ),
          guide(
            'Keep profile indexing limited',
            'A profile that is not indexed is harder to stumble onto from a name search.',
            'After you change a privacy setting, check the indexing control on that platform so the old public copy can drop off.',
            [L.results, L.linkedin]
          )
        ),
      ],
    },
    {
      id: 'brokers',
      name: 'Data brokers and people-search sites',
      short: 'Brokers',
      intro: 'Sites that sell a report built from public records and public profiles.',
      items: [
        item(
          'brokers-optout',
          'Opt-outs',
          'Have you opted out of the big people-search sites?',
          'Handled means you submitted the opt-out yourself and you check again a couple of times a year. This page does not look anyone up.',
          94,
          [
            handled('I opted out of the big sites, and I check again a couple of times a year.'),
            partial('I removed myself from one or two, and I have not looked since.'),
            open('I have never looked, or I know a listing is still up.'),
          ],
          guide(
            'Opt out of people-search sites',
            'Those sites collect addresses, relatives, and phone numbers from public records and sell the page.',
            'Open the opt-out page on that site and follow it there. The FTC explains the pattern: search on their site, use their removal form, and repeat later because listings come back. Do not type a name or an address into this page.',
            [L.ftcBrokers, L.results, L.spokeo, L.whitepages, L.beenVerified, L.intelius]
          ),
          guide(
            'Keep a twice-a-year opt-out check',
            'People-search listings come back when a public record changes. A repeat check is the part that lasts.',
            'Put a reminder on a calendar you already use. Start again from the same official opt-out pages.',
            [L.ftcBrokers, L.spokeo]
          )
        ),
        item(
          'brokers-contact',
          'Contact details',
          'Do people-search pages still show a current phone number or home address?',
          'Handled means you have checked and those current details are not on the pages. Still open means they are listed, or you have not checked.',
          92,
          [
            handled('I have checked. No current phone or home address is on those pages.'),
            partial('An old number or an old address is still listed.'),
            open('A current phone or home address is listed, or I have not checked.'),
          ],
          guide(
            'Remove a current phone number and home address from people-search pages',
            'A current address on a people-search page is the detail that turns a name into a place.',
            'Use the opt-out form on that site. For a Google result that shows contact details, use Results about you. You do not type the address into this page.',
            [L.ftcBrokers, L.results, L.resultsTool, L.spokeo]
          ),
          guide(
            'Keep current contact details off people-search pages',
            'An old address is a smaller trail than the one where you live now.',
            'When you move or change numbers, run the opt-out again so the new details do not sit on the old listing.',
            [L.resultsTool, L.spokeo]
          )
        ),
        item(
          'brokers-family',
          'Relatives',
          'Do those pages list relatives or people you live with?',
          'Handled means you removed those associations where the site allows it.',
          62,
          [
            handled('I removed those associations where the site allows it.'),
            partial('Some relative names are still attached.'),
            open('The pages still connect a household, or I have not looked.'),
          ],
          guide(
            'Remove relative listings where the site allows it',
            'A relative list is how a stranger maps a household from one public page.',
            'On each opt-out, remove the associated-people section if the form offers it. Each adult has to submit their own request. This page does not collect those names.',
            [L.ftcBrokers, L.whitepages, L.intelius]
          ),
          guide(
            'Keep household associations off the broker pages',
            'A listing that does not name the rest of the household is a smaller map.',
            'When a new listing appears, clear the associated-people section in the same opt-out.',
            [L.ftcBrokers]
          )
        ),
      ],
    },
    {
      id: 'accounts',
      name: 'Old accounts',
      short: 'Accounts',
      intro: 'Shops, apps, and forums you stopped using and the inbox that can still reset them.',
      items: [
        item(
          'accounts-old',
          'Unused',
          'How many old shop, app, and forum accounts are still open?',
          'Handled means you close an account when you stop using it, or you have already swept the old ones.',
          76,
          [
            handled('I close an account when I stop using it, or the old ones are already gone.'),
            partial('I know of a few I should close and have not yet.'),
            open('A long trail of accounts is still tied to the same inbox.'),
          ],
          guide(
            'Close accounts you no longer use',
            'An old account is still a breach, a password reset, and a profile you are not watching.',
            'Sign in from a bookmark, download what you need, then use the delete page on that site. Start with anything that stored a card or an address.',
            [L.inactive, L.facebookDelete, L.security]
          ),
          guide(
            'Keep closing an account when you stop using it',
            'An account you closed cannot be reset later from an inbox you forgot.',
            'When a shop or an app is done, delete it before you forget the login.',
            [L.inactive]
          )
        ),
        item(
          'accounts-reset',
          'Resets',
          'Where do password resets for those accounts go?',
          'Handled means they go to an inbox you control, with its own password and a second factor.',
          86,
          [
            handled('They go to an inbox I control, with its own password and a second factor.'),
            partial('They go to an inbox I control, and that inbox has no second factor.'),
            open('They go to an old address I no longer open, or I am not sure.'),
          ],
          guide(
            'Point password resets at an inbox you still control',
            'An old recovery address can reset the accounts you forgot, and anyone who opens that inbox can too.',
            'On each important account, open security settings and set the recovery email and phone to ones you still use. Add a second factor on the inbox that receives the resets. Do not type the address here.',
            [L.security, L.appleFactor, L.inactive]
          ),
          guide(
            'Keep resets on an inbox with a second factor',
            'The inbox that receives resets is the key to the other accounts.',
            'When a recovery address changes in your life, update it on the bank and the other mail the same week.',
            [L.security, L.appleFactor]
          )
        ),
        item(
          'accounts-saved',
          'Saved details',
          'Do old accounts still store a card, an address, or a copy of an ID?',
          'Handled means you removed saved cards and addresses before you stopped using them.',
          60,
          [
            handled('I removed saved cards and addresses before I stopped using them.'),
            partial('A few still have an old address or a card.'),
            open('I have not checked, or a card and a home address are still saved.'),
          ],
          guide(
            'Delete saved cards and addresses from accounts you keep',
            'A saved card or a shipping address stays in the account after you stop shopping there.',
            'Open payment and address settings and remove the copies you do not need. Then close the account if you are done with it.',
            [L.security, L.inactive]
          ),
          guide(
            'Keep saved cards off accounts you no longer open',
            'A card left in an old shop is a charge you will not be watching.',
            'When you stop using a shop, remove the card in the same visit as the logout.',
            [L.security]
          )
        ),
      ],
    },
    {
      id: 'location',
      name: 'Location sharing',
      short: 'Location',
      intro: 'History on the account, a live share, and apps that can see the phone all day.',
      items: [
        item(
          'location-history',
          'History',
          'Is a location history still being saved on the phone account?',
          'Handled means location history is off, or you review and delete it.',
          80,
          [
            handled('Location history is off, or I review and delete it.'),
            partial('It is on, and I have not looked at what it saved.'),
            open('It is on, and I have never opened the history.'),
          ],
          guide(
            'Turn off location history you do not review',
            'A location history is a diary of where the phone has been, and it is stored with the account.',
            'In the Google account, open Location History or Timeline and pause it, or delete the range you do not want kept. On an iPhone, review Significant Locations.',
            [L.location, L.appleLocation, L.activity]
          ),
          guide(
            'Keep location history off, or review it',
            'A history you never open is a diary you did not mean to keep.',
            'Leave it paused unless you use the timeline. If you use it, delete the range you do not need.',
            [L.location, L.appleLocation]
          )
        ),
        item(
          'location-live',
          'Live share',
          'Who can see live location right now?',
          'Handled means nobody, or only a person you chose, for a limited time.',
          88,
          [
            handled('Nobody, or only a person I chose, for a limited time.'),
            partial('A share is still on from an old trip or an old contact.'),
            open('Live location is shared with a broad list, or I am not sure who has it.'),
          ],
          guide(
            'Stop live location shares you did not mean to leave on',
            'A live share keeps updating after the trip, and it is easy to forget who was on the list.',
            'Open location sharing on the phone and in Google Maps. End the shares you do not still want. Leave a share only for a person and a time you chose.',
            [L.mapsShare, L.appleLocation]
          ),
          guide(
            'Keep live location shares short',
            'A share with an end time closes itself. A share with no end time does not.',
            'When you share for a trip, pick an end time before you leave.',
            [L.mapsShare, L.appleLocation]
          )
        ),
        item(
          'location-apps',
          'App location',
          'Which apps may use location?',
          'Handled means only apps that need it, and only while you are using them.',
          68,
          [
            handled('Only apps that need it, and only while I am using them.'),
            partial('Several apps have always-on location, and I have not reviewed them.'),
            open('Most apps can use location all the time.'),
          ],
          guide(
            'Set app location to while-using, or off',
            'An app with always-on location can record places that have nothing to do with the feature you opened.',
            'In iPhone Settings or Android permissions, set each app to While Using or Never. Leave Always only for an app you truly want in the background.',
            [L.android, L.appleLocation, L.appleApps]
          ),
          guide(
            'Keep always-on location for the few apps that need it',
            'While-using is enough for a map you open yourself.',
            'When a new app asks for Always, deny it unless the feature is broken without it.',
            [L.android, L.appleApps]
          )
        ),
      ],
    },
    {
      id: 'photos',
      name: 'Photo metadata',
      short: 'Photos',
      intro: 'Location stored in the file, album links, and what the picture itself shows.',
      items: [
        item(
          'photos-meta',
          'Metadata',
          'Do photos you post still include where they were taken?',
          'Handled means you strip location before posting, or you have checked that the app does it.',
          74,
          [
            handled('I strip location before posting, or I have checked that the app does it.'),
            partial('Some apps strip it and some do not, and I have not checked.'),
            open('I post original photos straight from the camera roll.'),
          ],
          guide(
            'Strip location from photos before they go online',
            'A photo can carry the coordinates of a home in data you do not see in the picture.',
            'On iPhone, open the photo info and remove the location, or use a share option that strips it. In Google Photos, remove location before you share the original file.',
            [L.photos, L.applePhotos]
          ),
          guide(
            'Keep location out of photos you post',
            'Stripping the file data is what keeps the coordinates off the upload.',
            'Before you post from a new app, share one test photo and check whether the location is still attached.',
            [L.photos, L.applePhotos]
          )
        ),
        item(
          'photos-albums',
          'Albums',
          'Are photo albums shared with a link anyone can open?',
          'Handled means shared albums are limited to people you invited, or sharing is off.',
          54,
          [
            handled('Shared albums are limited to people I invited, or sharing is off.'),
            partial('An old link still works and I have not revoked it.'),
            open('An album link is public, or I do not know where the links went.'),
          ],
          guide(
            'Close album links anyone can open',
            'A link to an album can be forwarded, and it keeps working after you forgot you made it.',
            'In Google Photos or iCloud shared albums, open the share settings and remove the link, or limit it to invited people.',
            [L.photos, L.applePhotos]
          ),
          guide(
            'Keep shared albums limited to invited people',
            'An invite list is a door you can close. A public link is not.',
            'When the event is over, remove the link instead of leaving it in a chat thread.',
            [L.photos]
          )
        ),
        item(
          'photos-frame',
          'In the frame',
          'Do shared photos show a home, a school, a workplace, or a street number?',
          'Handled means you crop those out, or you do not post them.',
          44,
          [
            handled('I crop those out, or I do not post them.'),
            partial('A few older posts still show them.'),
            open('Recent posts show a house, a school, or a street number.'),
          ],
          guide(
            'Remove posts that show a home or a school in the frame',
            'Location data can be stripped and the picture can still show the front door.',
            'Delete or archive those posts. Crop new photos so a house number, a school sign, or a street sign is not in the frame.',
            [L.applePhotos, L.photos]
          ),
          guide(
            'Keep house numbers and school signs out of the frame',
            'The picture is the part a stranger can read without any metadata.',
            'Before you post, look at the background once. Crop the number and the sign.',
            [L.applePhotos]
          )
        ),
      ],
    },
    {
      id: 'reviews',
      name: 'Public reviews and comments',
      short: 'Reviews',
      intro: 'The name on a review, the routine inside it, and old comment threads.',
      items: [
        item(
          'reviews-profile',
          'Review name',
          'Do public reviews use a full real name and a photo of your face?',
          'Handled means reviews use a limited name, or you do not post public reviews.',
          64,
          [
            handled('Reviews use a limited name, or I do not post public reviews.'),
            partial('Some sites show a full name and I have not changed it.'),
            open('Reviews show a full name and a face photo on purpose.'),
          ],
          guide(
            'Limit the name and photo on public reviews',
            'A review attached to a full name and a face is easy to connect to a listing and a social profile.',
            'In the account that posts the reviews, set the profile name and photo used for contributions. Edit or delete old reviews you do not want attached to that profile.',
            [L.reviews, L.results]
          ),
          guide(
            'Keep a limited name on public reviews',
            'The business review does not need a face and a full legal name.',
            'When a new site asks for a public profile, set the limited name before the first review.',
            [L.reviews]
          )
        ),
        item(
          'reviews-routine',
          'Routine',
          'Do reviews name a home, a school, a workplace, or a daily routine?',
          'Handled means reviews stay on the business and do not describe a routine.',
          58,
          [
            handled('Reviews stay on the business and do not describe a routine.'),
            partial('A few mention a neighborhood or a workplace.'),
            open('Reviews describe where I live, a daily route, or a school.'),
          ],
          guide(
            'Edit reviews that describe a home, a school, or a routine',
            'The useful part of a review is the business. The routine and the school are the part a stranger can use.',
            'Edit or delete those reviews. Leave the comment about the service, and take out the street, the school, and the schedule.',
            [L.reviews, L.results]
          ),
          guide(
            'Keep routines out of public reviews',
            'A review can praise the service without naming the street or the school.',
            'Read the last line before you post. If it says when you are there every day, delete that line.',
            [L.reviews]
          )
        ),
        item(
          'reviews-comments',
          'Old comments',
          'Are old comments on news sites, forums, and videos still public?',
          'Handled means you deleted them, or you accept that they sit under a name you no longer use.',
          50,
          [
            handled('I deleted them, or they sit under a name I no longer use and I accept that.'),
            partial('I know of a few threads and have not gone back.'),
            open('Years of comments are still up under my everyday name.'),
          ],
          guide(
            'Delete old comments that used your everyday name',
            'Comment history is a timeline, and it often sits on sites you no longer visit.',
            'Sign in and delete the comments, or close the account. If the site will not delete them, remove the name and the photo from that profile.',
            [L.results, L.facebookDelete]
          ),
          guide(
            'Keep old comment profiles from using your everyday name',
            'A name you no longer use is a smaller link than the one on your current accounts.',
            'When you leave a forum, delete the comments or rename the profile before you forget the login.',
            [L.results]
          )
        ),
      ],
    },
    {
      id: 'breaches',
      name: 'Breach exposure habits',
      short: 'Breaches',
      intro: 'Whether you look, what you change, and whether mail asks for a second step.',
      items: [
        item(
          'breaches-check',
          'Check',
          'Do you check whether an email account of yours has shown up in a breach?',
          'Handled means you check a breach-notification site yourself and you change passwords when it names one. Do not type the address here.',
          84,
          [
            handled('I check a breach site myself, and I change passwords when it names one.'),
            partial('I have checked once, and I do not have a habit.'),
            open('I have never checked, or I ignore the notices.'),
          ],
          guide(
            'Check a breach list yourself, then change what it names',
            'A breach means a password or a phone number from that account is already in circulation.',
            'Open Have I Been Pwned in your own browser and check an address you control. This page never sees it. If a breach is listed, change that password and turn on a second factor. Do not reuse the new password.',
            [L.pwned, L.identity, L.security]
          ),
          guide(
            'Keep checking when you hear about a breach',
            'The notice is the moment to change the password. Waiting leaves the stolen copy working.',
            'When a site you use is in the news, check the address yourself and change that password the same day.',
            [L.pwned, L.security]
          )
        ),
        item(
          'breaches-reuse',
          'Reuse',
          'After a breach, what happens to passwords that were the same on other sites?',
          'Handled means each important account already has its own password, so one breach stays on one site.',
          100,
          [
            handled('Each important account already has its own password.'),
            partial('I change the breached site and sometimes miss a copy.'),
            open('One password, or a small tweak of it, is still used in several places.'),
          ],
          guide(
            'Give a breached password a unique replacement everywhere it was used',
            'The stolen password is tried on mail and banks next. Changing it on one site leaves the other copies working.',
            'Change the named account, then every other account that used the same password. A password manager is the practical way to keep them different. Do not type a password here.',
            [L.pwned, L.security, L.identity]
          ),
          guide(
            'Keep a different password on each important account',
            'Unique passwords are what stop one breached site from opening the others.',
            'When you add an account, generate a new password for it. If you notice a repeat, replace the copy the same day.',
            [L.pwned, L.security]
          )
        ),
        item(
          'breaches-factor',
          'Second factor',
          'Do mail and banking ask for a second step when the password is already known?',
          'Handled means an app, a prompt, or a passkey on both mail and the bank. A text message is a partial step.',
          96,
          [
            handled(
              'Yes. An app, a prompt, or a passkey on mail and the bank. Not a text message.'
            ),
            partial(
              'Text messages on mail and the bank, or one of those accounts has no second step.'
            ),
            open('No second step, or I approve every prompt without looking.'),
          ],
          guide(
            'Turn on a second factor for mail and banking',
            'A leaked password is enough when the site asks for nothing else.',
            'In the account security settings, add an authenticator app or a passkey. Save backup codes in a password manager, not in the inbox they protect.',
            [L.security, L.appleFactor, L.identity]
          ),
          guide(
            'Keep a second factor on mail and banking',
            'The second step is what stops someone who has the password and nothing more.',
            'Leave it on. When a site offers a passkey, you can add that beside the app you already use.',
            [L.security, L.appleFactor]
          )
        ),
      ],
    },
    {
      id: 'devices',
      name: 'Smart devices',
      short: 'Devices',
      intro: 'Mics and cameras on the account, voice history, and who can still open the door.',
      items: [
        item(
          'devices-list',
          'Device list',
          'Do you know which voice assistants and cameras are on the account?',
          'Handled means you know which devices have a mic or a camera, and the ones you do not want are muted or removed.',
          72,
          [
            handled(
              'I know which devices have a mic or a camera, and the extras are muted or removed.'
            ),
            partial('A few spare devices are still on the account.'),
            open('I am not sure which devices are on the account.'),
          ],
          guide(
            'Review mics and cameras on the account',
            'A speaker or a camera you forgot is still signed in, and its recordings sit with the account.',
            'Open the Alexa, Google Home, or Apple Home device list. Remove devices you do not use. Mute or cover a camera that does not need to be on.',
            [L.alexa, L.nest, L.appleApps]
          ),
          guide(
            'Keep the device list limited to what you still use',
            'A device that is not on the account cannot keep a recording there.',
            'When you replace a speaker or a camera, remove the old one from the account the same day.',
            [L.alexa, L.nest]
          )
        ),
        item(
          'devices-voice',
          'Voice history',
          'Do you review or delete voice recordings?',
          'Handled means recording history is off, or you delete it.',
          66,
          [
            handled('Recording history is off, or I delete it.'),
            partial('It is on, and I have never deleted it.'),
            open('I did not know the recordings were saved.'),
          ],
          guide(
            'Delete voice recordings you do not need',
            'Voice history can include whatever was said near the device, including conversations you did not mean to save.',
            'In the assistant privacy settings, delete the saved recordings and turn off voice-history saving if you do not want a new one.',
            [L.assistant, L.audio, L.alexa, L.nest]
          ),
          guide(
            'Keep voice history off, or delete it',
            'A history you do not review is a microphone log.',
            'Leave audio saving off unless you use the transcripts. If you use them, delete the range you do not need.',
            [L.assistant, L.audio]
          )
        ),
        item(
          'devices-guests',
          'Guests',
          'Who else can control the lights, locks, and cameras?',
          'Handled means only people who still live there, and old guests are removed.',
          46,
          [
            handled('Only people who still live here, and old guests are removed.'),
            partial('An old guest or a former roommate might still be on the home.'),
            open('I have not checked who has access.'),
          ],
          guide(
            'Remove old guests from the home',
            'A former roommate with lock or camera access still has it until you remove them.',
            'Open the home app sharing list and remove anyone who should not control the devices. Change the Wi-Fi password if they knew it.',
            [L.nest, L.alexa, L.appleApps]
          ),
          guide(
            'Keep the home sharing list current',
            'Access you can name is access you can revoke.',
            'When someone moves out, remove them from the home the same week.',
            [L.nest]
          )
        ),
      ],
    },
    {
      id: 'apps',
      name: 'App permissions',
      short: 'Apps',
      intro: 'Contacts, the microphone, tracking across apps, and apps you no longer open.',
      items: [
        item(
          'apps-access',
          'Access',
          'Which apps can read contacts, photos, or the microphone?',
          'Handled means you reviewed permissions this year and removed the ones that are not needed.',
          52,
          [
            handled('I reviewed permissions this year and removed the ones that are not needed.'),
            partial('I allowed them when the app asked and have not been back.'),
            open('Most apps still have contacts, photos, or the microphone.'),
          ],
          guide(
            'Remove app access to contacts, photos, and the microphone',
            'A game or a coupon app does not need the address book, and the address book is a list of other people.',
            'In iPhone Settings or Android Privacy, open each permission and deny it for apps that are not using it for the feature you wanted.',
            [L.android, L.appleApps]
          ),
          guide(
            'Keep a yearly pass over app permissions',
            'A permission granted on install day is easy to forget.',
            'Once a year, open the permission list and deny anything the app no longer needs.',
            [L.android, L.appleApps]
          )
        ),
        item(
          'apps-tracking',
          'Tracking',
          'Can apps track activity across other apps and websites?',
          'Handled means tracking is off, or limited to apps you chose.',
          78,
          [
            handled('Tracking is off, or limited to apps I chose.'),
            partial('Some are allowed and I have not reviewed the list.'),
            open('Tracking is on for most apps.'),
          ],
          guide(
            'Turn off cross-app tracking',
            'Tracking links what you do in one app to what you do in another, and that profile is sold.',
            'On iPhone, open Settings, Privacy and Security, Tracking, and turn off Allow Apps to Request to Track, or deny each app. On Android, review My Ad Center and the advertising controls.',
            [L.appleTrack, L.adCenter, L.android]
          ),
          guide(
            'Keep cross-app tracking off',
            'An app can work without following you into the other apps.',
            'When a new app asks to track, deny it. Leave tracking only where you already decided it was worth it.',
            [L.appleTrack, L.adCenter]
          )
        ),
        item(
          'apps-unused',
          'Unused apps',
          'What happens to permissions when you stop using an app?',
          'Handled means you delete apps you do not use, and you check that their access is gone.',
          42,
          [
            handled('I delete apps I do not use, and I check that their access is gone.'),
            partial('Unused apps are still installed.'),
            open('I install freely and rarely remove anything.'),
          ],
          guide(
            'Delete apps you do not use',
            'An installed app can keep the permissions you granted the day you tried it.',
            'Delete the app. On the phone, confirm the permission list no longer includes it. Download it again later from the official store if you need it.',
            [L.android, L.appleApps]
          ),
          guide(
            'Keep unused apps off the phone',
            'An app that is not installed cannot use the contacts or the microphone.',
            'When you stop opening an app, delete it instead of leaving it in a folder.',
            [L.android, L.appleApps]
          )
        ),
      ],
    },
  ];

  var ITEMS = [];
  AREAS.forEach(function (area) {
    area.items.forEach(function (entry) {
      ITEMS.push({
        id: entry.id,
        areaId: area.id,
        areaName: area.name,
        areaShort: area.short,
        short: entry.short,
        prompt: entry.prompt,
        detail: entry.detail,
        priority: entry.priority,
        states: entry.states,
        fix: entry.fix,
        keep: entry.keep,
      });
    });
  });

  var TIERS = [
    {
      id: 'quiet',
      max: 5,
      name: 'Quiet footprint',
      summary: 'Little of what you reported is easy for a stranger to collect.',
    },
    {
      id: 'tucked',
      max: 16,
      name: 'Mostly tucked in',
      summary: 'A few trails are still public. The first three steps close the widest ones.',
    },
    {
      id: 'trails',
      max: 30,
      name: 'Some trails',
      summary: 'Enough is public that a search can connect the pieces. Start with the first three.',
    },
    {
      id: 'findable',
      max: 42,
      name: 'Easy to find',
      summary: 'A lot of this is still public. The plan is ordered so the first three do the most.',
    },
    {
      id: 'open',
      max: 54,
      name: 'Wide open',
      summary: 'Most of the checklist is still open. Do the first three before the rest.',
    },
  ];

  function choiceById(entry, id) {
    if (!entry) return null;
    for (var i = 0; i < entry.states.length; i++) {
      if (entry.states[i].id === id) return entry.states[i];
    }
    return null;
  }

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) {
      if (ITEMS[i].id === id) return ITEMS[i];
    }
    return null;
  }

  function maxScore() {
    return ITEMS.length * 2;
  }

  function normalizeAnswers(input) {
    var out = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    ITEMS.forEach(function (entry) {
      var picked = input[entry.id];
      if (typeof picked !== 'string') return;
      if (!choiceById(entry, picked)) return;
      out[entry.id] = picked;
    });
    return out;
  }

  function tierFor(score, max) {
    var value = Number(score);
    var ceiling = Number(max);
    if (!isFinite(value) || value < 0) value = 0;
    if (!isFinite(ceiling) || ceiling <= 0) ceiling = maxScore();
    if (ceiling !== maxScore()) {
      value = Math.round((value / ceiling) * maxScore());
    }
    value = Math.max(0, Math.min(maxScore(), Math.round(value)));
    for (var i = 0; i < TIERS.length; i++) {
      if (value <= TIERS[i].max) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  function exposureWord(score, max) {
    if (score == null || max == null || max <= 0) return 'unanswered';
    var ratio = score / max;
    if (ratio <= 0) return 'quiet';
    if (ratio <= 0.5) return 'some';
    return 'open';
  }

  function planItem(entry, kind, source, points) {
    return {
      id: entry.id,
      kind: kind,
      priority: entry.priority + (points === 2 ? 10 : 0),
      base: entry.priority,
      title: source.title,
      why: source.why,
      how: source.how,
      links: source.links,
      areaId: entry.areaId,
      points: points,
    };
  }

  function byPriority(a, b) {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.areaId < b.areaId) return -1;
    if (a.areaId > b.areaId) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  }

  function areaStats(answers) {
    return AREAS.map(function (area) {
      var score = 0;
      var answered = 0;
      area.items.forEach(function (entry) {
        var picked = answers[entry.id];
        var selected = picked ? choiceById(entry, picked) : null;
        if (!selected) return;
        answered += 1;
        score += selected.points;
      });
      var max = area.items.length * 2;
      return {
        id: area.id,
        name: area.name,
        short: area.short,
        score: score,
        max: max,
        percent: max ? Math.round((score / max) * 100) : 0,
        answered: answered,
        total: area.items.length,
        word: answered ? exposureWord(score, max) : 'unanswered',
      };
    });
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function radarModel(stats, size) {
    var canvas = size || 360;
    var cx = canvas / 2;
    var cy = canvas / 2;
    var radius = canvas * 0.28;
    var n = stats.length || 1;
    function point(index, scale) {
      var angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
      return {
        x: round1(cx + Math.cos(angle) * radius * scale),
        y: round1(cy + Math.sin(angle) * radius * scale),
      };
    }
    var axes = stats.map(function (area, index) {
      var ratio = area.max ? area.score / area.max : 0;
      if (!isFinite(ratio) || ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      return {
        id: area.id,
        short: area.short,
        ratio: Math.round(ratio * 1000) / 1000,
        point: point(index, ratio),
        edge: point(index, 1),
        label: point(index, 1.48),
      };
    });
    var rings = [0.25, 0.5, 0.75, 1].map(function (scale) {
      return axes.map(function (_axis, index) {
        return point(index, scale);
      });
    });
    return { size: canvas, cx: cx, cy: cy, radius: radius, axes: axes, rings: rings };
  }

  function scoreAudit(raw) {
    var answers = normalizeAnswers(raw);
    var score = 0;
    var answered = 0;
    var fixes = [];
    var keeps = [];
    ITEMS.forEach(function (entry) {
      var picked = answers[entry.id];
      var selected = picked ? choiceById(entry, picked) : null;
      if (!selected) return;
      answered += 1;
      score += selected.points;
      if (selected.points > 0) fixes.push(planItem(entry, 'fix', entry.fix, selected.points));
      else keeps.push(planItem(entry, 'keep', entry.keep, 0));
    });
    fixes.sort(byPriority);
    keeps.sort(byPriority);
    var plan = fixes.slice();
    var keepIndex = 0;
    while (plan.length < 3 && keepIndex < keeps.length) {
      plan.push(keeps[keepIndex]);
      keepIndex += 1;
    }
    plan = plan.map(function (row, index) {
      return {
        id: row.id,
        kind: row.kind,
        priority: row.priority,
        title: row.title,
        why: row.why,
        how: row.how,
        links: row.links,
        areaId: row.areaId,
        points: row.points,
        rank: index + 1,
        lead: index < 3,
      };
    });
    var ceiling = maxScore();
    var tier = tierFor(score, ceiling);
    var areas = areaStats(answers);
    return {
      score: score,
      max: ceiling,
      percent: ceiling ? Math.round((score / ceiling) * 100) : 0,
      answered: answered,
      total: ITEMS.length,
      complete: ITEMS.length > 0 && answered === ITEMS.length,
      tier: tier.name,
      tierId: tier.id,
      summary: tier.summary,
      areas: areas,
      radar: radarModel(areas),
      fixes: plan.filter(function (row) {
        return row.kind === 'fix';
      }),
      plan: plan,
      leads: plan.filter(function (row) {
        return row.lead;
      }),
      answers: answers,
    };
  }

  function filterDone(raw, result) {
    var allowed = {};
    ((result && result.fixes) || []).forEach(function (row) {
      allowed[row.id] = true;
    });
    var out = [];
    var seen = {};
    var list = Array.isArray(raw) ? raw : [];
    list.forEach(function (id) {
      if (typeof id !== 'string' || !allowed[id] || seen[id]) return;
      seen[id] = true;
      out.push(id);
    });
    return out;
  }

  function toggleDone(done, id, checked, result) {
    var next = Array.isArray(done) ? done.slice() : [];
    if (checked) {
      if (next.indexOf(id) === -1) next.push(id);
    } else {
      next = next.filter(function (itemId) {
        return itemId !== id;
      });
    }
    return filterDone(next, result);
  }

  function storedPayload(rawAnswers, rawDone) {
    var answers = normalizeAnswers(rawAnswers);
    if (!Object.keys(answers).length && !(Array.isArray(rawDone) && rawDone.length)) return null;
    var scored = scoreAudit(answers);
    return { v: STORE_VERSION, answers: scored.answers, done: filterDone(rawDone, scored) };
  }

  function normalizeStored(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var scored = scoreAudit(value.answers);
    if (!Object.keys(scored.answers).length) return null;
    return {
      v: STORE_VERSION,
      answers: scored.answers,
      done: filterDone(value.done, scored),
      score: scored.score,
      max: scored.max,
      tier: scored.tier,
      tierId: scored.tierId,
      complete: scored.complete,
    };
  }

  function shareLine(input) {
    var score = input && Number(input.score);
    var max = input && Number(input.max);
    var tier = input && typeof input.tier === 'string' ? input.tier.trim() : '';
    var url = (input && input.url) || SHARE_URL;
    if (!isFinite(score) || !isFinite(max) || !tier) return 'Digital Footprint Check. ' + url;
    return (
      'My digital footprint scored ' +
      Math.round(score) +
      '/' +
      Math.round(max) +
      ' exposure (' +
      tier +
      ') on the CyberScryb Digital Footprint Check. ' +
      url
    );
  }

  function asksForIdentity(text) {
    var value = String(text || '');
    if (
      /\b(type|enter|paste|submit|give us|tell us)\s+(?:us\s+)?your\s+(?:full\s+name|name|e-?mail|phone(?:\s+number)?|home\s+address|address)\b/i.test(
        value
      )
    ) {
      return true;
    }
    return /\bwhat(?:'s| is) your (full name|name|e-?mail|phone|address|home address)\b/i.test(
      value
    );
  }

  function linkIssue(href) {
    var url;
    try {
      url = new URL(href);
    } catch {
      return 'bad-url';
    }
    if (url.protocol !== 'https:') return 'protocol';
    if (ALLOWED_HOSTS.indexOf(url.hostname) === -1) return 'host';
    if (url.username || url.password) return 'userinfo';
    return '';
  }

  function contentIssues() {
    var issues = [];
    var ids = {};
    if (AREAS.length !== 9) issues.push('areas ' + AREAS.length);
    if (ITEMS.length !== 27) issues.push('items ' + ITEMS.length);
    if (maxScore() !== 54) issues.push('max ' + maxScore());
    AREAS.forEach(function (area) {
      if (!area.id || ids['area:' + area.id]) issues.push('area-id ' + area.id);
      ids['area:' + area.id] = true;
      if (!area.name || !area.short || area.short.length > 12) issues.push('area-name ' + area.id);
      if (!area.items || area.items.length !== 3) issues.push('area-count ' + area.id);
    });
    ITEMS.forEach(function (entry) {
      if (!entry.id || !/^[a-z0-9-]{3,32}$/.test(entry.id) || ids[entry.id]) {
        issues.push('id ' + entry.id);
      }
      ids[entry.id] = true;
      if (!entry.prompt || entry.prompt.length < 20) issues.push('prompt ' + entry.id);
      if (!entry.detail || entry.detail.length < 20) issues.push('detail ' + entry.id);
      ['prompt', 'detail', 'short'].forEach(function (key) {
        if (asksForIdentity(entry[key])) issues.push('asks ' + entry.id);
        if (/[<>]/.test(entry[key] || '')) issues.push('markup ' + entry.id);
      });
      if (!entry.states || entry.states.length !== 3) issues.push('states ' + entry.id);
      var seenPoints = {};
      (entry.states || []).forEach(function (state) {
        seenPoints[state.points] = true;
        if (!/^(handled|partial|open)$/.test(state.id)) issues.push('state ' + entry.id);
        if (!state.label || state.label.length < 8) issues.push('label ' + entry.id);
        if (asksForIdentity(state.label)) issues.push('asks ' + entry.id);
        if (/[<>]/.test(state.label || '')) issues.push('markup ' + entry.id);
      });
      if (!seenPoints[0] || !seenPoints[1] || !seenPoints[2]) issues.push('points ' + entry.id);
      ['fix', 'keep'].forEach(function (kind) {
        var block = entry[kind];
        if (!block || !block.title || !block.why || !block.how || !block.links) {
          issues.push(kind + ' ' + entry.id);
          return;
        }
        var blob = block.title + ' ' + block.why + ' ' + block.how;
        if (asksForIdentity(blob)) issues.push('asks ' + entry.id);
        if (/[<>]/.test(blob)) issues.push('markup ' + entry.id);
        if (!block.links.length) issues.push('links ' + entry.id);
        block.links.forEach(function (itemLink) {
          var problem = linkIssue(itemLink.href);
          if (problem || !itemLink.label) issues.push('link ' + entry.id + ' ' + problem);
        });
      });
    });
    return issues;
  }

  return {
    SHARE_URL: SHARE_URL,
    STORE_VERSION: STORE_VERSION,
    AREAS: AREAS,
    ITEMS: ITEMS,
    TIERS: TIERS,
    ALLOWED_HOSTS: ALLOWED_HOSTS,
    maxScore: maxScore,
    normalizeAnswers: normalizeAnswers,
    tierFor: tierFor,
    exposureWord: exposureWord,
    areaStats: areaStats,
    radarModel: radarModel,
    scoreAudit: scoreAudit,
    filterDone: filterDone,
    toggleDone: toggleDone,
    storedPayload: storedPayload,
    normalizeStored: normalizeStored,
    shareLine: shareLine,
    asksForIdentity: asksForIdentity,
    linkIssue: linkIssue,
    contentIssues: contentIssues,
    itemById: itemById,
  };
});
